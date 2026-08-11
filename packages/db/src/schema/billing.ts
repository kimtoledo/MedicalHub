import { index, integer, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { clinics } from './clinics';
import { encounters } from './encounters';
import { patients } from './patients';
import { services } from './appointments';
import { id, timestamps } from './helpers';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'pending',
  'paid',
  'voided',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'gcash',
  'card',
  'bank_transfer',
  'other',
]);

// ---------------------------------------------------------------------------
// invoices — top-level billing record for a patient encounter
// TENANT SCOPED: every query must filter by clinic_id.
// ---------------------------------------------------------------------------

export const invoices = pgTable(
  'invoices',
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
    /** Source encounter — may be null if created ad-hoc */
    encounterId: uuid('encounter_id')
      .references(() => encounters.id, { onDelete: 'set null' }),

    /** e.g. SBDINV000001 — format: {CLINIC_PREFIX}INV{6-digit seq} */
    invoiceNumber: varchar('invoice_number', { length: 30 }).notNull().unique(),

    status: invoiceStatusEnum('status').notNull().default('pending'),

    /**
     * Sum of all line item totals, in PHP (two decimal places).
     * Denormalized for fast listing; recomputed on any line-item change.
     */
    totalAmountPhp: numeric('total_amount_php', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),

    notes: text('notes'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    /** User who created the invoice */
    createdBy: uuid('created_by'),
    ...timestamps,
  },
  (t) => ({
    clinicIdx:   index('invoices_clinic_id_idx').on(t.clinicId),
    patientIdx:  index('invoices_patient_id_idx').on(t.patientId),
    encounterIdx: index('invoices_encounter_id_idx').on(t.encounterId),
    statusIdx:   index('invoices_status_idx').on(t.clinicId, t.status),
    issuedAtIdx: index('invoices_issued_at_idx').on(t.clinicId, t.issuedAt),
  }),
);

// ---------------------------------------------------------------------------
// invoice_line_items — snapshot of each service at time of billing
// Prices are snapshotted so future price changes don't alter historical records.
// ---------------------------------------------------------------------------

export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    id: id(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    clinicId: uuid('clinic_id').notNull(),

    /** Reference to the service; nullable if service was deleted */
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'set null' }),

    /** Snapshot of service name at time of billing */
    description: varchar('description', { length: 300 }).notNull(),
    /** Price per unit, snapshotted in PHP */
    unitPricePhp: numeric('unit_price_php', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    quantity: integer('quantity').notNull().default(1),
    /** unitPricePhp × quantity */
    totalPhp: numeric('total_php', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),

    /** FDI tooth reference if applicable */
    toothRef: varchar('tooth_ref', { length: 50 }),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => ({
    invoiceIdx: index('invoice_line_items_invoice_id_idx').on(t.invoiceId),
  }),
);

// ---------------------------------------------------------------------------
// invoice_payments — single payment record per invoice (MVP 1 = one payment only)
// ---------------------------------------------------------------------------

export const invoicePayments = pgTable(
  'invoice_payments',
  {
    id: id(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    clinicId: uuid('clinic_id').notNull(),

    amountPhp: numeric('amount_php', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    /** ISO date string: YYYY-MM-DD */
    paymentDate: varchar('payment_date', { length: 20 }).notNull(),

    recordedBy: uuid('recorded_by'),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => ({
    invoiceIdx: index('invoice_payments_invoice_id_idx').on(t.invoiceId),
    clinicIdx:  index('invoice_payments_clinic_id_idx').on(t.clinicId),
    dateIdx:    index('invoice_payments_date_idx').on(t.clinicId, t.paymentDate),
  }),
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Invoice         = typeof invoices.$inferSelect;
export type NewInvoice      = typeof invoices.$inferInsert;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InvoicePayment  = typeof invoicePayments.$inferSelect;
