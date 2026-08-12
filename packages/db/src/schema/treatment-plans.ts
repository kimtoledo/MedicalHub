import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { dentists } from './dentists';
import { patients } from './patients';
import { services } from './appointments';
import { treatmentRecords } from './encounters';
import { id, timestamps } from './helpers';

export const treatmentPlanStatusEnum = pgEnum('treatment_plan_status', [
  'draft',
  'approved',
  'archived',
]);

export const treatmentPlanItemStatusEnum = pgEnum('treatment_plan_item_status', [
  'proposed',
  'accepted',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

/**
 * treatment_plans — dentist-authored proposed care for one tenant patient.
 * All reads and writes must be scoped by clinic_id.
 */
export const treatmentPlans = pgTable(
  'treatment_plans',
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
    title: varchar('title', { length: 200 }).notNull(),
    notes: text('notes'),
    status: treatmentPlanStatusEnum('status').notNull().default('draft'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: uuid('approved_by'),
    createdBy: uuid('created_by'),
    ...timestamps,
  },
  (t) => ({
    clinicIdx: index('treatment_plans_clinic_id_idx').on(t.clinicId),
    patientIdx: index('treatment_plans_patient_id_idx').on(t.clinicId, t.patientId),
    dentistIdx: index('treatment_plans_dentist_id_idx').on(t.dentistId),
    statusIdx: index('treatment_plans_status_idx').on(t.clinicId, t.status),
  }),
);

/** Proposed procedures and their execution lifecycle within a treatment plan. */
export const treatmentPlanItems = pgTable(
  'treatment_plan_items',
  {
    id: id(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => treatmentPlans.id, { onDelete: 'cascade' }),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'set null' }),
    toothRef: varchar('tooth_ref', { length: 50 }),
    area: varchar('area', { length: 100 }),
    estimatedFeePhp: numeric('estimated_fee_php', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    priority: varchar('priority', { length: 20 }).notNull().default('medium'),
    sequence: integer('sequence').notNull(),
    status: treatmentPlanItemStatusEnum('status').notNull().default('proposed'),
    treatmentRecordId: uuid('treatment_record_id')
      .references(() => treatmentRecords.id, { onDelete: 'set null' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => ({
    planIdx: index('treatment_plan_items_plan_id_idx').on(t.planId),
    patientIdx: index('treatment_plan_items_patient_id_idx').on(t.clinicId, t.patientId),
    statusIdx: index('treatment_plan_items_status_idx').on(t.clinicId, t.status),
  }),
);

export type TreatmentPlan = typeof treatmentPlans.$inferSelect;
export type NewTreatmentPlan = typeof treatmentPlans.$inferInsert;
export type TreatmentPlanItem = typeof treatmentPlanItems.$inferSelect;
export type NewTreatmentPlanItem = typeof treatmentPlanItems.$inferInsert;
