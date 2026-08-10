import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { clinics } from './clinics';
import { dentists } from './dentists';
import { patients } from './patients';
import { services } from './appointments';
import { id, timestamps } from './helpers';

export const encounterStatusEnum = pgEnum('encounter_status', [
  'draft',
  'final',
]);

/**
 * encounters — clinical visit records.
 * One encounter per clinical session. May be linked to a scheduled appointment or
 * created ad-hoc for walk-in patients.
 * TENANT SCOPED: every query must filter by clinic_id.
 */
export const encounters = pgTable(
  'encounters',
  {
    id: id(),
    /** Tenant scope */
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    dentistId: uuid('dentist_id')
      .references(() => dentists.id, { onDelete: 'set null' }),

    /** May be null for walk-in encounters not booked in advance */
    appointmentId: uuid('appointment_id'),

    /** Date of the encounter (date string: YYYY-MM-DD) */
    date: varchar('date', { length: 20 }).notNull(),

    // Clinical notes — all free-text; structured fields added in MVP 2
    chiefComplaint: text('chief_complaint'),
    examination: text('examination'),
    assessment: text('assessment'),
    procedures: text('procedures'),
    recommendations: text('recommendations'),
    notes: text('notes'),

    status: encounterStatusEnum('status').notNull().default('draft'),

    /** ID of the user who created the encounter */
    createdBy: uuid('created_by'),

    ...timestamps,
  },
  (t) => ({
    clinicIdx: index('encounters_clinic_id_idx').on(t.clinicId),
    patientIdx: index('encounters_patient_id_idx').on(t.patientId),
    dentistIdx: index('encounters_dentist_id_idx').on(t.dentistId),
    dateIdx: index('encounters_date_idx').on(t.clinicId, t.date),
    appointmentIdx: index('encounters_appointment_id_idx').on(t.appointmentId),
  }),
);

/**
 * treatment_records — individual procedures performed during an encounter.
 * One encounter may have many treatment records (e.g. extraction + filling).
 */
export const treatmentRecords = pgTable(
  'treatment_records',
  {
    id: id(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'set null' }),

    /**
     * Tooth reference — FDI notation ("16", "36") or descriptive ("upper-left-quadrant").
     * Nullable for procedures that don't target a specific tooth.
     */
    toothRef: varchar('tooth_ref', { length: 50 }),

    notes: text('notes'),

    /** Dentist who performed the procedure */
    performedBy: uuid('performed_by')
      .references(() => dentists.id, { onDelete: 'set null' }),
    performedAt: timestamp('performed_at', { withTimezone: true }),

    ...timestamps,
  },
  (t) => ({
    clinicIdx: index('treatment_records_clinic_id_idx').on(t.clinicId),
    encounterIdx: index('treatment_records_encounter_id_idx').on(t.encounterId),
    patientIdx: index('treatment_records_patient_id_idx').on(t.patientId),
  }),
);

export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
export type TreatmentRecord = typeof treatmentRecords.$inferSelect;
export type NewTreatmentRecord = typeof treatmentRecords.$inferInsert;
