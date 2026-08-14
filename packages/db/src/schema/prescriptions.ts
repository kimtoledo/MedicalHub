import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { branches } from './branches';
import { clinics } from './clinics';
import { dentists } from './dentists';
import { encounters } from './encounters';
import { patients } from './patients';
import { id, timestamps } from './helpers';

// ---------------------------------------------------------------------------
// prescriptions — issued e-Rx documents.
//
// Prescriptions are IMMUTABLE once issued. To correct a prescription,
// a dentist creates an amendment: a new prescription linked back to the
// original via amended_from_id.
//
// TENANT SCOPED: every query must filter by clinic_id.
// ---------------------------------------------------------------------------

export const prescriptions = pgTable(
  'prescriptions',
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

    /** Prescribing dentist — may be null if dentist record is later removed */
    dentistId: uuid('dentist_id')
      .references(() => dentists.id, { onDelete: 'set null' }),

    /** Source encounter — required for MVP 1 prescription creation */
    encounterId: uuid('encounter_id')
      .references(() => encounters.id, { onDelete: 'set null' }),

    /**
     * Self-referential FK for amendments.
     * When a dentist amends a prescription, a new row is created with
     * amended_from_id pointing to the original prescription id.
     * Uses a lambda to break the circular reference.
     */
    amendedFromId: uuid('amended_from_id')
      .references((): AnyPgColumn => prescriptions.id, { onDelete: 'restrict' }),

    // ── Snapshot fields — captured at issue time so the printed Rx
    //    remains accurate even if clinic/patient/dentist records change ──────
    /** Editable per prescription; pre-filled from dentist.license_number */
    prcLicenseNumber: varchar('prc_license_number', { length: 50 }),
    /** Clinic name snapshot */
    clinicNameSnapshot: varchar('clinic_name_snapshot', { length: 200 }),
    /** Clinic address snapshot */
    clinicAddressSnapshot: text('clinic_address_snapshot'),
    /** Patient full name snapshot */
    patientNameSnapshot: varchar('patient_name_snapshot', { length: 200 }),
    /** Prescribing dentist full name snapshot */
    dentistNameSnapshot: varchar('dentist_name_snapshot', { length: 200 }),

    /** General notes / sig instructions that apply to the whole Rx */
    notes: text('notes'),

    /**
     * Clinic logo URL snapshotted at issuance so the Rx remains
     * accurate even if the clinic later changes its logo.
     */
    clinicLogoUrl: varchar('clinic_logo_url', { length: 500 }),

    /**
     * Template ID snapshotted at issuance: 'classic' | 'modern' | 'minimal'.
     * Determines which layout is rendered when printing / downloading.
     */
    templateId: varchar('template_id', { length: 20 }).notNull().default('classic'),

    /**
     * Dentist signature image (base64 data-URL) snapshotted at issuance.
     * Stored as text because base64 images exceed varchar limits.
     */
    signatureUrl: text('signature_url'),

    /** Timestamp of issuance (immutable after set) */
    issuedAt: timestamp('issued_at', { withTimezone: true }),

    /** User ID of the staff member who issued the prescription */
    issuedBy: uuid('issued_by'),

    ...timestamps,
  },
  (t) => ({
    clinicIdx:    index('prescriptions_clinic_id_idx').on(t.clinicId),
    patientIdx:   index('prescriptions_patient_id_idx').on(t.patientId),
    encounterIdx: index('prescriptions_encounter_id_idx').on(t.encounterId),
    dentistIdx:   index('prescriptions_dentist_id_idx').on(t.dentistId),
    amendedIdx:   index('prescriptions_amended_from_id_idx').on(t.amendedFromId),
  }),
);

// ---------------------------------------------------------------------------
// prescription_items — individual medicine lines within a prescription.
// ---------------------------------------------------------------------------

export const prescriptionItems = pgTable(
  'prescription_items',
  {
    id: id(),

    prescriptionId: uuid('prescription_id')
      .notNull()
      .references(() => prescriptions.id, { onDelete: 'cascade' }),

    /** Denormalized for fast tenant-scoped queries */
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),

    /** Generic or brand drug name */
    medicineName: varchar('medicine_name', { length: 300 }).notNull(),

    /** e.g. "500mg", "0.1%", "1 tab" */
    dosage: varchar('dosage', { length: 200 }),

    /** e.g. "TID", "Once daily", "Every 8 hours" */
    frequency: varchar('frequency', { length: 200 }),

    /** e.g. "7 days", "Until finished", "PRN" */
    duration: varchar('duration', { length: 200 }),

    /** Special instructions — sig line on the prescription */
    specialInstructions: text('special_instructions'),

    /** Display order within the prescription */
    sortOrder: integer('sort_order').notNull().default(0),

    ...timestamps,
  },
  (t) => ({
    prescriptionIdx: index('prescription_items_prescription_id_idx').on(t.prescriptionId),
    clinicIdx:       index('prescription_items_clinic_id_idx').on(t.clinicId),
  }),
);

export type Prescription    = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
export type PrescriptionItem    = typeof prescriptionItems.$inferSelect;
export type NewPrescriptionItem = typeof prescriptionItems.$inferInsert;
