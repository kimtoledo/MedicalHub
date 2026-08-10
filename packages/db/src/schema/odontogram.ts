import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { dentists } from './dentists';
import { patients } from './patients';
import { id } from './helpers';

/**
 * odontogram_events — immutable, append-only tooth chart event log.
 *
 * IMPORTANT: Never UPDATE or DELETE rows in this table.
 * To correct a recorded event, insert a new row with `correction_of` pointing
 * to the row being corrected. The UI/API layer resolves the chain to show
 * the latest effective state for each tooth+surface combination.
 *
 * TENANT SCOPED: every query must filter by clinic_id.
 */
export const odontogramEvents = pgTable(
  'odontogram_events',
  {
    id: id(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    dentistId: uuid('dentist_id')
      .references(() => dentists.id, { onDelete: 'set null' }),

    /** Encounter during which this event was recorded (nullable for history imports) */
    encounterId: uuid('encounter_id'),

    /**
     * FDI tooth number 11–48 (International Standard).
     * For permanent teeth: 11-18, 21-28, 31-38, 41-48.
     * For deciduous teeth: 51-55, 61-65, 71-75, 81-85.
     * Stored as varchar to accommodate supra-numerary and shorthand notation.
     */
    toothNumber: varchar('tooth_number', { length: 10 }).notNull(),

    /**
     * Tooth surfaces involved, comma-separated.
     * Permanent notation: M (mesial), D (distal), O (occlusal), B (buccal),
     * L (lingual), I (incisal), F (facial).
     * Empty string = whole tooth.
     */
    surfaces: varchar('surfaces', { length: 30 }).notNull().default(''),

    /**
     * Condition code (observed state).
     * Examples: 'sound', 'caries', 'missing', 'impacted', 'crown', 'bridge_pontic',
     * 'root_fragment', 'implant', 'fracture', 'mobility'.
     * Use a shared vocabulary; enforce via application layer.
     */
    conditionCode: varchar('condition_code', { length: 50 }),

    /**
     * Procedure code (treatment performed at this visit).
     * Examples: 'extraction', 'composite_filling', 'amalgam_filling',
     * 'root_canal', 'crown_placement', 'scaling', 'bleaching'.
     */
    procedureCode: varchar('procedure_code', { length: 50 }),

    note: text('note'),

    /**
     * Self-referential FK. When set, this row corrects the referenced event.
     * The referenced row is NOT deleted — the chain is preserved for audit.
     */
    correctionOf: uuid('correction_of'),

    /** No updated_at — this table is append-only */
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    clinicIdx: index('odontogram_clinic_id_idx').on(t.clinicId),
    patientIdx: index('odontogram_patient_id_idx').on(t.patientId),
    toothIdx: index('odontogram_tooth_idx').on(t.patientId, t.toothNumber),
    encounterIdx: index('odontogram_encounter_id_idx').on(t.encounterId),
  }),
);

export type OdontogramEvent = typeof odontogramEvents.$inferSelect;
export type NewOdontogramEvent = typeof odontogramEvents.$inferInsert;
