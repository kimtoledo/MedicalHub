import { and, count, desc, eq, isNull } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { aiImagingAnalyses, appointments, clinicalFiles, encounters, odontogramEvents, patients, treatmentRecords } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';

export type AiImagingActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export class AiImagingError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
export type AiImagingService = ReturnType<typeof createAiImagingService>;

function score(input: { odontogram: number; treatments: number; encounters: number; appointments: number }) {
  return Math.max(0, Math.min(100, 100 - input.odontogram * 2 - input.treatments * 3 + Math.min(input.encounters, 5) * 2 + Math.min(input.appointments, 5)));
}
export function createAiImagingService(database: DB) {
  return {
    analyzeRadiograph: async (clinicId: string, fileId: string, encounterId: string | undefined, actor: AiImagingActor) => database.transaction(async (tx) => {
      const [file] = await tx.select({ id: clinicalFiles.id, patientId: clinicalFiles.patientId, encounterId: clinicalFiles.encounterId, fileType: clinicalFiles.fileType }).from(clinicalFiles).where(and(eq(clinicalFiles.id, fileId), eq(clinicalFiles.clinicId, clinicId))).limit(1);
      if (!file) throw new AiImagingError('FILE_NOT_FOUND', 'Clinical file not found in this clinic', 404);
      if (file.fileType !== 'radiograph') throw new AiImagingError('RADIOGRAPH_REQUIRED', 'AI imaging accepts radiograph files only');
      if (encounterId) {
        const [encounter] = await tx.select({ id: encounters.id, patientId: encounters.patientId }).from(encounters).where(and(eq(encounters.id, encounterId), eq(encounters.clinicId, clinicId), eq(encounters.patientId, file.patientId))).limit(1);
        if (!encounter) throw new AiImagingError('ENCOUNTER_NOT_FOUND', 'Encounter does not belong to this file and clinic', 404);
      }
      const [odontogram, treatments, encounterCount, appointmentCount] = await Promise.all([
        tx.select({ total: count(odontogramEvents.id) }).from(odontogramEvents).where(and(eq(odontogramEvents.clinicId, clinicId), eq(odontogramEvents.patientId, file.patientId))),
        tx.select({ total: count(treatmentRecords.id) }).from(treatmentRecords).where(and(eq(treatmentRecords.clinicId, clinicId), eq(treatmentRecords.patientId, file.patientId))),
        tx.select({ total: count(encounters.id) }).from(encounters).where(and(eq(encounters.clinicId, clinicId), eq(encounters.patientId, file.patientId))),
        tx.select({ total: count(appointments.id) }).from(appointments).where(and(eq(appointments.clinicId, clinicId), eq(appointments.patientId, file.patientId))),
      ]);
      const oralHealthScore = score({ odontogram: Number(odontogram[0]?.total ?? 0), treatments: Number(treatments[0]?.total ?? 0), encounters: Number(encounterCount[0]?.total ?? 0), appointments: Number(appointmentCount[0]?.total ?? 0) });
      const [analysis] = await tx.insert(aiImagingAnalyses).values({ clinicId, fileId, patientId: file.patientId, encounterId: encounterId ?? file.encounterId, model: 'rules-baseline', status: 'completed', findings: [], oralHealthScore }).returning();
      if (!analysis) throw new AiImagingError('ANALYSIS_FAILED', 'Unable to store imaging analysis', 500);
      await writeAudit(tx, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'ai_imaging_analysis', entityId: analysis.id, action: AuditAction.AI_IMAGING_ANALYZED, metadata: JSON.stringify({ fileId, model: 'rules-baseline', findingCount: 0, oralHealthScore }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return analysis;
    }),
    list: async (clinicId: string, patientId: string) => database.select().from(aiImagingAnalyses).where(and(eq(aiImagingAnalyses.clinicId, clinicId), eq(aiImagingAnalyses.patientId, patientId))).orderBy(aiImagingAnalyses.createdAt),
    confirm: async (clinicId: string, analysisId: string, actor: AiImagingActor) => database.transaction(async (tx) => {
      const [current] = await tx.select({ id: aiImagingAnalyses.id, status: aiImagingAnalyses.status }).from(aiImagingAnalyses).where(and(eq(aiImagingAnalyses.id, analysisId), eq(aiImagingAnalyses.clinicId, clinicId))).limit(1).for('update');
      if (!current) throw new AiImagingError('ANALYSIS_NOT_FOUND', 'Analysis not found', 404);
      if (current.status !== 'completed') throw new AiImagingError('ANALYSIS_NOT_READY', 'Only completed analyses can be confirmed', 409);
      const [row] = await tx.update(aiImagingAnalyses).set({ confirmedBy: actor.id, confirmedAt: new Date() }).where(eq(aiImagingAnalyses.id, analysisId)).returning();
      await writeAudit(tx, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'ai_imaging_analysis', entityId: analysisId, action: AuditAction.AI_IMAGING_CONFIRMED, metadata: JSON.stringify({}), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    }),
    oralHealthScore: async (clinicId: string, patientId: string) => {
      const [patient] = await database.select({ id: patients.id }).from(patients).where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId), isNull(patients.deletedAt))).limit(1);
      if (!patient) throw new AiImagingError('PATIENT_NOT_FOUND', 'Patient not found in this clinic', 404);
      const [latest] = await database.select({ score: aiImagingAnalyses.oralHealthScore, createdAt: aiImagingAnalyses.createdAt }).from(aiImagingAnalyses).where(and(eq(aiImagingAnalyses.clinicId, clinicId), eq(aiImagingAnalyses.patientId, patientId), eq(aiImagingAnalyses.status, 'completed'))).orderBy(desc(aiImagingAnalyses.createdAt)).limit(1);
      return latest ?? { score: null, createdAt: null };
    },
  };
}
