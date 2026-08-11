import { index, pgTable, text, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { id, timestamps, deletedAt } from './helpers';

/**
 * patients — TENANT-SCOPED to a clinic.
 *
 * IMPORTANT: A patient with the same phone/email in two different clinics is
 * treated as two separate patient records. Never automatically merge across clinics.
 * clinic_id is the tenant boundary — every query MUST filter by clinic_id.
 */
export const patients = pgTable(
  'patients',
  {
    id: id(),
    /** Tenant scope — non-negotiable, never nullable */
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),

    /** Internal patient number, unique within the clinic */
    patientNumber: varchar('patient_number', { length: 50 }).notNull(),

    // Demographics — do NOT use in public route slugs
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    middleName: varchar('middle_name', { length: 100 }),
    dateOfBirth: varchar('date_of_birth', { length: 20 }),
    sex: varchar('sex', { length: 10 }),
    civilStatus: varchar('civil_status', { length: 20 }),
    occupation: varchar('occupation', { length: 200 }),
    nationality: varchar('nationality', { length: 100 }),

    // Contact
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    province: varchar('province', { length: 100 }),

    // Emergency contact
    emergencyContactName: varchar('emergency_contact_name', { length: 200 }),
    emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
    emergencyContactRelation: varchar('emergency_contact_relation', { length: 100 }),

    // Guardian (for minors)
    guardianName: varchar('guardian_name', { length: 200 }),
    guardianPhone: varchar('guardian_phone', { length: 20 }),
    guardianRelation: varchar('guardian_relation', { length: 100 }),

    status: varchar('status', { length: 20 }).notNull().default('active'),
    notes: text('notes'),

    ...timestamps,
    ...deletedAt,
  },
  (t) => ({
    clinicIdx: index('patients_clinic_id_idx').on(t.clinicId),
    patientNumberIdx: index('patients_patient_number_idx').on(t.clinicId, t.patientNumber),
    patientNumberUnique: unique('patients_clinic_patient_number_unique').on(t.clinicId, t.patientNumber),
    nameIdx: index('patients_name_idx').on(t.clinicId, t.lastName, t.firstName),
  }),
);

/**
 * patient_medical_histories — versioned; never silently overwrite old records.
 * Each update creates a new row; latest by created_at is the current version.
 */
export const patientMedicalHistories = pgTable(
  'patient_medical_histories',
  {
    id: id(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),

    // Baseline questionnaire fields
    allergies: text('allergies'),
    currentMedications: text('current_medications'),
    majorConditions: text('major_conditions'),
    isPregnant: varchar('is_pregnant', { length: 10 }),
    physicianName: varchar('physician_name', { length: 200 }),
    physicianPhone: varchar('physician_phone', { length: 20 }),
    notes: text('notes'),

    /** ID of the user who recorded this version */
    recordedBy: uuid('recorded_by'),
    ...timestamps,
  },
  (t) => ({
    patientIdx: index('med_hist_patient_id_idx').on(t.patientId),
  }),
);

/**
 * patient_dental_histories — versioned dental questionnaire per patient.
 * Each update creates a new row; latest by created_at is the current version.
 * Mirrors the same append-only versioning pattern as patient_medical_histories.
 */
export const patientDentalHistories = pgTable(
  'patient_dental_histories',
  {
    id: id(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),

    // Dental questionnaire fields
    lastDentalVisit: varchar('last_dental_visit', { length: 50 }),
    previousTreatments: text('previous_treatments'),
    hasSensitivity: varchar('has_sensitivity', { length: 10 }),
    hasBleedingGums: varchar('has_bleeding_gums', { length: 10 }),
    hasPain: varchar('has_pain', { length: 10 }),
    oralHabits: text('oral_habits'),
    orthodonticHistory: text('orthodontic_history'),
    chiefConcerns: text('chief_concerns'),
    notes: text('notes'),

    /** ID of the user who recorded this version */
    recordedBy: uuid('recorded_by'),
    ...timestamps,
  },
  (t) => ({
    patientIdx: index('dental_hist_patient_id_idx').on(t.patientId),
  }),
);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type PatientMedicalHistory = typeof patientMedicalHistories.$inferSelect;
export type PatientDentalHistory = typeof patientDentalHistories.$inferSelect;
