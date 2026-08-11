import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { users } from './users';
import { invoices } from './billing';
import { encounters } from './encounters';

// ---------------------------------------------------------------------------
// hmo_payers — HMO providers the clinic is accredited with.
// TENANT SCOPED: every query must filter by clinic_id.
// ---------------------------------------------------------------------------

export const hmoPayers = pgTable(
  'hmo_payers',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),

    /** e.g. Maxicare, Intellicare, PhilCare, Medicard */
    name: varchar('name', { length: 200 }).notNull(),

    accreditationNumber: varchar('accreditation_number', { length: 100 }),
    contactPerson: varchar('contact_person', { length: 200 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    contactEmail: varchar('contact_email', { length: 300 }),
    notes: text('notes'),

    isActive: varchar('is_active', { length: 5 }).notNull().default('true'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clinicIdx: index('hmo_payers_clinic_id_idx').on(t.clinicId),
  }),
);

// ---------------------------------------------------------------------------
// patient_hmo_memberships — A patient's HMO card records.
// A patient may have multiple memberships (e.g. primary + dependent).
// TENANT SCOPED.
// ---------------------------------------------------------------------------

export const patientHmoMemberships = pgTable(
  'patient_hmo_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),

    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),

    hmoPayer: uuid('hmo_payer_id').references(() => hmoPayers.id, { onDelete: 'set null' }),

    /**
     * HMO payer name snapshot — preserved even if the payer is deleted.
     * Updated automatically when a payer is selected.
     */
    payerNameSnapshot: varchar('payer_name_snapshot', { length: 200 }).notNull(),

    cardNumber: varchar('card_number', { length: 100 }).notNull(),

    /** Name as printed on the HMO card */
    memberName: varchar('member_name', { length: 200 }),

    /** dental | medical | combined */
    coverageType: varchar('coverage_type', { length: 30 }).notNull().default('dental'),

    /** YYYY-MM-DD */
    effectiveDate: varchar('effective_date', { length: 20 }),
    /** YYYY-MM-DD */
    expiryDate: varchar('expiry_date', { length: 20 }),

    isActive: varchar('is_active', { length: 5 }).notNull().default('true'),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    patientIdx: index('patient_hmo_memberships_patient_id_idx').on(t.patientId),
    clinicIdx:  index('patient_hmo_memberships_clinic_id_idx').on(t.clinicId),
  }),
);

// ---------------------------------------------------------------------------
// hmo_claims — Claim tracker.
// One claim per encounter / invoice.
// Statuses: prepared → submitted → approved | rejected → paid
// TENANT SCOPED.
// ---------------------------------------------------------------------------

export const hmoClaims = pgTable(
  'hmo_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),

    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),

    hmoPayer: uuid('hmo_payer_id').references(() => hmoPayers.id, { onDelete: 'set null' }),

    /** Payer name snapshot */
    payerNameSnapshot: varchar('payer_name_snapshot', { length: 200 }).notNull(),

    membershipId: uuid('membership_id').references(
      () => patientHmoMemberships.id,
      { onDelete: 'set null' },
    ),

    /** Linked invoice — null if claim is created before billing */
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),

    /** Source encounter */
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),

    /** Clinic-generated claim tracking number (e.g. HMOCLM000001) */
    claimNumber: varchar('claim_number', { length: 60 }).notNull(),

    /** Letter of Authorization / approval code issued by the HMO */
    loaCode: varchar('loa_code', { length: 100 }),

    /** Amount being claimed, in PHP */
    claimAmountPhp: numeric('claim_amount_php', { precision: 10, scale: 2 }).notNull(),

    /** Actual amount approved by HMO (may differ from claimed) */
    approvedAmountPhp: numeric('approved_amount_php', { precision: 10, scale: 2 }),

    /** prepared | submitted | approved | rejected | paid */
    status: varchar('status', { length: 30 }).notNull().default('prepared'),

    submittedAt:  timestamp('submitted_at',  { withTimezone: true }),
    approvedAt:   timestamp('approved_at',   { withTimezone: true }),
    rejectedAt:   timestamp('rejected_at',   { withTimezone: true }),
    paidAt:       timestamp('paid_at',       { withTimezone: true }),

    rejectionReason: text('rejection_reason'),
    notes: text('notes'),

    preparedBy: uuid('prepared_by').references(() => users.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clinicIdx:     index('hmo_claims_clinic_id_idx').on(t.clinicId),
    patientIdx:    index('hmo_claims_patient_id_idx').on(t.patientId),
    invoiceIdx:    index('hmo_claims_invoice_id_idx').on(t.invoiceId),
    statusIdx:     index('hmo_claims_status_idx').on(t.clinicId, t.status),
    claimNumberIdx: uniqueIndex('hmo_claims_claim_number_idx').on(t.claimNumber),
  }),
);

// Types
export type HmoPayer           = typeof hmoPayers.$inferSelect;
export type HmoPayerInsert     = typeof hmoPayers.$inferInsert;
export type PatientHmoMembership = typeof patientHmoMemberships.$inferSelect;
export type HmoClaim           = typeof hmoClaims.$inferSelect;
export type HmoClaimInsert     = typeof hmoClaims.$inferInsert;
