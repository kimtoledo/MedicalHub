import { boolean, index, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { clinics } from './clinics';
import { dentists } from './dentists';
import { patients } from './patients';
import { organizationServices } from './organizations';
import { id, timestamps } from './helpers';

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
]);

/**
 * services — bookable dental services per clinic.
 */
export const services = pgTable(
  'services',
  {
    id: id(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    category: varchar('category', { length: 100 }).notNull().default('General'),
    description: text('description'),
    /** Set when this service was adopted from an organization's central catalog; NULL for a clinic-only service. */
    organizationServiceId: uuid('organization_service_id').references(() => organizationServices.id, { onDelete: 'set null' }),
    /** Duration in minutes */
    durationMinutes: varchar('duration_minutes', { length: 10 }).notNull().default('30'),
    /** Price in PHP (two decimal places). NULL means price not yet set. */
    pricePhp: numeric('price_php', { precision: 10, scale: 2 }),
    /** Whether this service is visible in public booking flows. */
    isBookable: boolean('is_bookable').notNull().default(true),
    /** Whether this service is reimbursable by HMO providers */
    isHmoCovered: varchar('is_hmo_covered', { length: 5 }).notNull().default('false'),
    /** Standard HMO reimbursement rate in PHP (may differ from clinic price) */
    hmoStandardRatePhp: numeric('hmo_standard_rate_php', { precision: 10, scale: 2 }),
    isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
    ...timestamps,
  },
  (t) => ({
    clinicIdx: index('services_clinic_id_idx').on(t.clinicId),
  }),
);

/**
 * appointments — core scheduling entity.
 * TENANT SCOPED: every query must filter by clinic_id.
 * Double-booking prevention must be enforced at the API layer with
 * a transaction + database-level check.
 */
export const appointments = pgTable(
  'appointments',
  {
    id: id(),
    /** Tenant scope */
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    dentistId: uuid('dentist_id').references(() => dentists.id),
    serviceId: uuid('service_id').references(() => services.id),
    /** NULL for public/walk-in bookings not yet linked to a patient record */
    patientId: uuid('patient_id').references(() => patients.id),

    status: appointmentStatusEnum('status').notNull().default('pending'),

    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),

    // Patient contact for public bookings (before patient record is created)
    patientFirstName: varchar('patient_first_name', { length: 100 }),
    patientLastName: varchar('patient_last_name', { length: 100 }),
    patientPhone: varchar('patient_phone', { length: 20 }),
    patientEmail: varchar('patient_email', { length: 255 }),

    chiefComplaint: text('chief_complaint'),
    notes: text('notes'),
    cancellationReason: text('cancellation_reason'),

    /** ID of the user who booked (NULL for public/anonymous bookings) */
    bookedBy: uuid('booked_by'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    ...timestamps,
  },
  (t) => ({
    clinicIdx: index('appointments_clinic_id_idx').on(t.clinicId),
    branchIdx: index('appointments_branch_id_idx').on(t.branchId),
    dentistIdx: index('appointments_dentist_id_idx').on(t.dentistId),
    patientIdx: index('appointments_patient_id_idx').on(t.patientId),
    startsAtIdx: index('appointments_starts_at_idx').on(t.clinicId, t.startsAt),
    statusIdx: index('appointments_status_idx').on(t.clinicId, t.status),
  }),
);

/**
 * appointment_status_history — immutable log of every status transition.
 */
export const appointmentStatusHistory = pgTable(
  'appointment_status_history',
  {
    id: id(),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    clinicId: uuid('clinic_id').notNull(),
    fromStatus: appointmentStatusEnum('from_status'),
    toStatus: appointmentStatusEnum('to_status').notNull(),
    changedBy: uuid('changed_by'),
    reason: text('reason'),
    ...timestamps,
  },
  (t) => ({
    appointmentIdx: index('appt_hist_appointment_id_idx').on(t.appointmentId),
  }),
);

export type Service = typeof services.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
