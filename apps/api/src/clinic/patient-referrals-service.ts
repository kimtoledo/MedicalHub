import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DB } from '@dentra/db';
import { clinics, organizationClinics, patientReferrals, patients } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';
import type { PatientActor } from './patients-service.js';

export class PatientReferralError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
export type PatientReferralService = ReturnType<typeof createPatientReferralService>;

const summarySelection = {
  id: patientReferrals.id,
  organizationId: patientReferrals.organizationId,
  sourceClinicId: patientReferrals.sourceClinicId,
  sourcePatientId: patientReferrals.sourcePatientId,
  targetClinicId: patientReferrals.targetClinicId,
  targetPatientId: patientReferrals.targetPatientId,
  reason: patientReferrals.reason,
  consentedAt: patientReferrals.consentedAt,
  status: patientReferrals.status,
  respondedAt: patientReferrals.respondedAt,
  createdAt: patientReferrals.createdAt,
};

export function createPatientReferralService(database: DB) {
  const sameOrganization = async (sourceClinicId: string, targetClinicId: string) => {
    const [sourceLink] = await database.select({ organizationId: organizationClinics.organizationId }).from(organizationClinics).where(eq(organizationClinics.clinicId, sourceClinicId)).limit(1);
    if (!sourceLink) throw new PatientReferralError('CLINIC_NOT_IN_ORGANIZATION', 'The referring clinic does not belong to an organization', 403);
    const [targetLink] = await database.select({ organizationId: organizationClinics.organizationId }).from(organizationClinics).where(eq(organizationClinics.clinicId, targetClinicId)).limit(1);
    if (!targetLink || targetLink.organizationId !== sourceLink.organizationId) throw new PatientReferralError('CLINIC_NOT_IN_ORGANIZATION', 'Both clinics must belong to the same organization', 403);
    return sourceLink.organizationId;
  };

  return {
    create: async (sourceClinicId: string, sourcePatientId: string, targetClinicId: string, input: { reason: string; consented: boolean }, actor: PatientActor) => {
      if (!input.consented) throw new PatientReferralError('CONSENT_REQUIRED', 'Explicit patient consent is required before referring a patient', 422);
      if (sourceClinicId === targetClinicId) throw new PatientReferralError('SAME_CLINIC', 'The target clinic must be different from the referring clinic', 400);
      const organizationId = await sameOrganization(sourceClinicId, targetClinicId);
      const [patient] = await database.select({ id: patients.id }).from(patients).where(and(eq(patients.id, sourcePatientId), eq(patients.clinicId, sourceClinicId))).limit(1);
      if (!patient) throw new PatientReferralError('PATIENT_NOT_FOUND', 'Patient not found at the referring clinic', 404);
      const [targetClinic] = await database.select({ id: clinics.id }).from(clinics).where(eq(clinics.id, targetClinicId)).limit(1);
      if (!targetClinic) throw new PatientReferralError('CLINIC_NOT_FOUND', 'Target clinic not found', 404);
      const [created] = await database.insert(patientReferrals).values({ organizationId, sourceClinicId, sourcePatientId, targetClinicId, reason: input.reason, consentedAt: new Date(), createdBy: actor.id }).returning(summarySelection);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId: sourceClinicId, entityType: 'patient_referral', entityId: created.id, action: AuditAction.PATIENT_REFERRAL_CREATED, metadata: JSON.stringify({ targetClinicId, sourcePatientId }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return created;
    },

    listForClinic: async (clinicId: string) => {
      const targetClinicAlias = alias(clinics, 'target_clinic');
      return database
        .select({ ...summarySelection, sourceClinicName: clinics.name, targetClinicName: targetClinicAlias.name, sourcePatientFirstName: patients.firstName, sourcePatientLastName: patients.lastName })
        .from(patientReferrals)
        .innerJoin(clinics, eq(clinics.id, patientReferrals.sourceClinicId))
        .innerJoin(targetClinicAlias, eq(targetClinicAlias.id, patientReferrals.targetClinicId))
        .innerJoin(patients, eq(patients.id, patientReferrals.sourcePatientId))
        .where(or(eq(patientReferrals.sourceClinicId, clinicId), eq(patientReferrals.targetClinicId, clinicId)))
        .orderBy(desc(patientReferrals.createdAt));
    },

    accept: async (referralId: string, targetClinicId: string, actor: PatientActor) => database.transaction(async (tx) => {
      const [referral] = await tx.select().from(patientReferrals).where(and(eq(patientReferrals.id, referralId), eq(patientReferrals.targetClinicId, targetClinicId), eq(patientReferrals.status, 'pending'))).limit(1).for('update');
      if (!referral) throw new PatientReferralError('REFERRAL_NOT_FOUND', 'Pending referral not found for this clinic', 404);
      const [sourcePatient] = await tx.select({ firstName: patients.firstName, lastName: patients.lastName, middleName: patients.middleName, dateOfBirth: patients.dateOfBirth, sex: patients.sex, phone: patients.phone, email: patients.email, address: patients.address, city: patients.city, province: patients.province }).from(patients).where(eq(patients.id, referral.sourcePatientId)).limit(1);
      if (!sourcePatient) throw new PatientReferralError('PATIENT_NOT_FOUND', 'The referred patient record no longer exists', 404);
      const [targetClinic] = await tx.select({ id: clinics.id, prefix: clinics.prefix }).from(clinics).where(and(eq(clinics.id, targetClinicId), inArray(clinics.status, ['trial', 'active']), isNull(clinics.deletedAt))).limit(1).for('update');
      if (!targetClinic) throw new PatientReferralError('CLINIC_NOT_FOUND', 'Target clinic not found', 404);
      const prefix = targetClinic.prefix.trim().toUpperCase();
      if (!prefix) throw new PatientReferralError('CLINIC_PREFIX_REQUIRED', 'Target clinic patient-number prefix is not configured', 409);
      const existing = await tx.select({ patientNumber: patients.patientNumber }).from(patients).where(eq(patients.clinicId, targetClinicId));
      const highest = existing.reduce((max, row) => { const match = row.patientNumber.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`)); return Math.max(max, match ? Number(match[1]) : 0); }, 0);
      const patientNumber = `${prefix}${String(highest + 1).padStart(6, '0')}`;
      const [createdPatient] = await tx.insert(patients).values({ clinicId: targetClinicId, patientNumber, ...sourcePatient }).returning({ id: patients.id, patientNumber: patients.patientNumber });
      const [updated] = await tx.update(patientReferrals).set({ targetPatientId: createdPatient.id, status: 'accepted', respondedBy: actor.id, respondedAt: new Date() }).where(eq(patientReferrals.id, referralId)).returning(summarySelection);
      await writeAudit(tx, { actorId: actor.id, actorEmail: actor.email, clinicId: targetClinicId, entityType: 'patient_referral', entityId: referralId, action: AuditAction.PATIENT_REFERRAL_ACCEPTED, metadata: JSON.stringify({ sourceClinicId: referral.sourceClinicId, newPatientId: createdPatient.id }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return { referral: updated, patient: createdPatient };
    }),

    decline: async (referralId: string, targetClinicId: string, actor: PatientActor) => database.transaction(async (tx) => {
      const [referral] = await tx.select({ id: patientReferrals.id, sourceClinicId: patientReferrals.sourceClinicId }).from(patientReferrals).where(and(eq(patientReferrals.id, referralId), eq(patientReferrals.targetClinicId, targetClinicId), eq(patientReferrals.status, 'pending'))).limit(1).for('update');
      if (!referral) throw new PatientReferralError('REFERRAL_NOT_FOUND', 'Pending referral not found for this clinic', 404);
      const [updated] = await tx.update(patientReferrals).set({ status: 'declined', respondedBy: actor.id, respondedAt: new Date() }).where(eq(patientReferrals.id, referralId)).returning(summarySelection);
      await writeAudit(tx, { actorId: actor.id, actorEmail: actor.email, clinicId: targetClinicId, entityType: 'patient_referral', entityId: referralId, action: AuditAction.PATIENT_REFERRAL_DECLINED, metadata: JSON.stringify({ sourceClinicId: referral.sourceClinicId }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return updated;
    }),
  };
}
