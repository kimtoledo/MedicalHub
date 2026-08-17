import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { branches, dentists, encounters, patients, services, treatmentRecords } from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';
import type { PatientActor } from './patients-service.js';

export type TreatmentInput = { serviceId: string; toothRef?: string; notes?: string; performedAt?: string };
export type TreatmentListFilters = { search: string; dateFrom?: string; dateTo?: string; branchIds?: string[]; dentistId?: string; serviceId?: string; workflowMode?: 'quick' | 'standard'; page: number; pageSize: number };
export type ClinicTreatmentsService = {
  serviceOptions: (clinicId: string) => Promise<Array<{ id: string; name: string }>>;
  list: (clinicId: string, filters: TreatmentListFilters) => Promise<{ items: Array<Record<string, unknown>>; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>;
  listForPatient: (clinicId: string, patientId: string) => Promise<Array<Record<string, unknown>> | null>;
  create: (clinicId: string, encounterId: string, dentistId: string | null, input: TreatmentInput, actor: PatientActor) => Promise<{ id: string }>;
};
export class ClinicTreatmentError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }

export function createClinicTreatmentsService(database: DB): ClinicTreatmentsService {
  return {
    serviceOptions: async (clinicId) => database.select({ id: services.id, name: services.name }).from(services).where(and(eq(services.clinicId, clinicId), eq(services.isActive, 'true'))).orderBy(asc(services.name)),
    list: async (clinicId, filters) => {
      const term = filters.search ? `%${filters.search}%` : null;
      const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00+08:00`) : null;
      const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999+08:00`) : null;
      const where = and(eq(treatmentRecords.clinicId, clinicId), filters.branchIds?.length ? inArray(encounters.branchId, filters.branchIds) : undefined, filters.dentistId ? eq(treatmentRecords.performedBy, filters.dentistId) : undefined, filters.serviceId ? eq(treatmentRecords.serviceId, filters.serviceId) : undefined, filters.workflowMode ? eq(services.workflowMode, filters.workflowMode) : undefined, from ? gte(treatmentRecords.performedAt, from) : undefined, to ? lte(treatmentRecords.performedAt, to) : undefined, term ? or(ilike(patients.firstName, term), ilike(patients.lastName, term), ilike(patients.patientNumber, term), ilike(services.name, term)) : undefined);
      const countBase = database.select({ total: count(treatmentRecords.id) }).from(treatmentRecords).innerJoin(encounters, and(eq(encounters.id, treatmentRecords.encounterId), eq(encounters.clinicId, clinicId))).innerJoin(patients, and(eq(patients.id, treatmentRecords.patientId), eq(patients.clinicId, clinicId))).leftJoin(services, and(eq(services.id, treatmentRecords.serviceId), eq(services.clinicId, clinicId)));
      const [{ total }] = await countBase.where(where);
      const items = await database.select({ id: treatmentRecords.id, encounterId: treatmentRecords.encounterId, appointmentId: encounters.appointmentId, patientId: treatmentRecords.patientId, patientNumber: patients.patientNumber, patientFirstName: patients.firstName, patientLastName: patients.lastName, branchId: encounters.branchId, branchName: branches.name, serviceId: treatmentRecords.serviceId, serviceName: services.name, workflowMode: services.workflowMode, toothRef: treatmentRecords.toothRef, performedBy: treatmentRecords.performedBy, dentistFirstName: dentists.firstName, dentistLastName: dentists.lastName, performedAt: treatmentRecords.performedAt, createdAt: treatmentRecords.createdAt }).from(treatmentRecords).innerJoin(encounters, and(eq(encounters.id, treatmentRecords.encounterId), eq(encounters.clinicId, clinicId))).innerJoin(patients, and(eq(patients.id, treatmentRecords.patientId), eq(patients.clinicId, clinicId))).innerJoin(branches, and(eq(branches.id, encounters.branchId), eq(branches.clinicId, clinicId))).leftJoin(services, and(eq(services.id, treatmentRecords.serviceId), eq(services.clinicId, clinicId))).leftJoin(dentists, eq(dentists.id, treatmentRecords.performedBy)).where(where).orderBy(desc(treatmentRecords.performedAt), desc(treatmentRecords.createdAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize);
      const numericTotal = Number(total ?? 0);
      return { items, pagination: { page: filters.page, pageSize: filters.pageSize, total: numericTotal, totalPages: Math.max(1, Math.ceil(numericTotal / filters.pageSize)) } };
    },
    listForPatient: async (clinicId, patientId) => {
      const [patient] = await database.select({ id: patients.id }).from(patients).where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId), isNull(patients.deletedAt))).limit(1);
      if (!patient) return null;
      return database.select({ id: treatmentRecords.id, encounterId: treatmentRecords.encounterId, patientId: treatmentRecords.patientId, serviceId: treatmentRecords.serviceId, serviceName: services.name, toothRef: treatmentRecords.toothRef, notes: treatmentRecords.notes, performedBy: treatmentRecords.performedBy, dentistFirstName: dentists.firstName, dentistLastName: dentists.lastName, performedAt: treatmentRecords.performedAt, createdAt: treatmentRecords.createdAt }).from(treatmentRecords).leftJoin(services, eq(treatmentRecords.serviceId, services.id)).leftJoin(dentists, eq(treatmentRecords.performedBy, dentists.id)).where(and(eq(treatmentRecords.clinicId, clinicId), eq(treatmentRecords.patientId, patientId))).orderBy(desc(treatmentRecords.performedAt), desc(treatmentRecords.createdAt));
    },
    create: async (clinicId, encounterId, dentistId, input, actor) => database.transaction(async (transaction) => {
      const [[encounter], [service]] = await Promise.all([transaction.select({ id: encounters.id, patientId: encounters.patientId, dentistId: encounters.dentistId, status: encounters.status }).from(encounters).where(and(eq(encounters.id, encounterId), eq(encounters.clinicId, clinicId))).limit(1).for('update'), transaction.select({ id: services.id }).from(services).where(and(eq(services.id, input.serviceId), eq(services.clinicId, clinicId), eq(services.isActive, 'true'))).limit(1)]);
      if (!encounter) throw new ClinicTreatmentError('ENCOUNTER_NOT_FOUND', 'Encounter not found', 404);
      if (dentistId && encounter.dentistId !== dentistId) throw new ClinicTreatmentError('FORBIDDEN', 'Only the encounter dentist can add treatment records', 403);
      const performedBy = dentistId ?? encounter.dentistId;
      if (!performedBy) throw new ClinicTreatmentError('DENTIST_PROFILE_REQUIRED', 'This encounter has no attributed dentist', 409);
      if (encounter.status === 'final') throw new ClinicTreatmentError('ENCOUNTER_FINAL', 'Finalize treatments before finalizing the encounter', 409);
      if (!service) throw new ClinicTreatmentError('SERVICE_UNAVAILABLE', 'Selected service is unavailable', 404);
      const [created] = await transaction.insert(treatmentRecords).values({ clinicId, encounterId, patientId: encounter.patientId, serviceId: service.id, toothRef: input.toothRef || null, notes: input.notes || null, performedBy, performedAt: input.performedAt ? new Date(input.performedAt) : new Date() }).returning({ id: treatmentRecords.id });
      await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'treatment_record', entityId: created.id, action: AuditAction.TREATMENT_RECORDED, metadata: JSON.stringify({ encounterId, patientId: encounter.patientId, serviceId: service.id, toothRef: input.toothRef ?? null }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return created;
    }),
  };
}
