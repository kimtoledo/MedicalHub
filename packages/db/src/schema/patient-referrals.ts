import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { organizations } from './organizations';
import { patients } from './patients';
import { id, timestamps } from './helpers';

export const patientReferralStatusEnum = pgEnum('patient_referral_status', ['pending', 'accepted', 'declined']);

/**
 * patient_referrals — a "shared registry" entry linking a patient's
 * record at one clinic to a (possibly not-yet-created) record at
 * another clinic in the SAME organization, with explicit patient
 * consent captured at referral time. This deliberately does NOT
 * merge or share the underlying clinical record across tenants —
 * `patients.clinic_id` remains non-negotiable per-clinic. Accepting a
 * referral creates a brand-new patient row at the target clinic,
 * seeded with only basic demographics (never full clinical history),
 * which the target clinic then owns and manages independently. Both
 * clinics can see this referral row once it exists — that shared
 * visibility of the referral itself (not the clinical record) is the
 * "shared registry."
 */
export const patientReferrals = pgTable('patient_referrals', {
  id: id(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  sourceClinicId: uuid('source_clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  sourcePatientId: uuid('source_patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  targetClinicId: uuid('target_clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  targetPatientId: uuid('target_patient_id').references(() => patients.id, { onDelete: 'set null' }),
  reason: text('reason').notNull(),
  consentedAt: timestamp('consented_at', { withTimezone: true }).notNull(),
  status: patientReferralStatusEnum('status').notNull().default('pending'),
  createdBy: uuid('created_by').notNull(),
  respondedBy: uuid('responded_by'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  ...timestamps,
}, (t) => ({
  sourceClinicIdx: index('patient_referrals_source_clinic_idx').on(t.sourceClinicId, t.status),
  targetClinicIdx: index('patient_referrals_target_clinic_idx').on(t.targetClinicId, t.status),
}));

export type PatientReferral = typeof patientReferrals.$inferSelect;
