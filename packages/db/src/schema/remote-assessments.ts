import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { users } from './users';

/**
 * A photo attached to a remote assessment request.
 * Stored as JSONB array on the assessment row for simplicity.
 */
export type AssessmentPhoto = {
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
};

/**
 * Remote assessment (tele-dentistry) request.
 * Submitted by a patient via a public shareable link.
 * Reviewed by a dentist inside the clinic app.
 */
export const remoteAssessments = pgTable(
  'remote_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),

    // Patient identity from the submission form (not a registered patient account)
    patientName:  varchar('patient_name', { length: 200 }).notNull(),
    patientEmail: varchar('patient_email', { length: 300 }).notNull(),
    patientPhone: varchar('patient_phone', { length: 50 }),

    complaint: text('complaint').notNull(),

    /**
     * Photos stored in Object Storage.
     * JSONB array of AssessmentPhoto objects.
     */
    photos: jsonb('photos').notNull().default([]),

    /** pending | reviewed | closed */
    status: varchar('status', { length: 30 }).notNull().default('pending'),

    // Dentist response
    dentistNotes: text('dentist_notes'),
    /** in_clinic_visit | prescription | monitoring | emergency | none */
    nextStep: varchar('next_step', { length: 50 }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

    /** Linked to existing patient record when the dentist links them */
    patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),

    /** True once a notification email has been sent to the patient */
    emailSent: varchar('email_sent', { length: 5 }).notNull().default('false'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clinicIdIdx:  index('remote_assessments_clinic_id_idx').on(t.clinicId),
    statusIdx:    index('remote_assessments_status_idx').on(t.clinicId, t.status),
    emailIdx:     index('remote_assessments_email_idx').on(t.patientEmail),
    patientIdIdx: index('remote_assessments_patient_id_idx').on(t.patientId),
  }),
);

export type RemoteAssessment = typeof remoteAssessments.$inferSelect;
export type RemoteAssessmentInsert = typeof remoteAssessments.$inferInsert;
