import { index, integer, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { services } from './appointments';
import { treatmentRecords } from './encounters';
import { id, timestamps } from './helpers';

export const recallStatusEnum = pgEnum('recall_status', ['upcoming', 'due', 'contacted', 'dismissed', 'booked']);

export const recallRules = pgTable('recall_rules', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  intervalDays: integer('interval_days').notNull(),
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  ...timestamps,
}, (t) => ({ clinicIdx: index('recall_rules_clinic_idx').on(t.clinicId), serviceIdx: index('recall_rules_service_idx').on(t.clinicId, t.serviceId), uniqueService: unique('recall_rules_clinic_service_unique').on(t.clinicId, t.serviceId) }));

export const patientRecalls = pgTable('patient_recalls', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
  ruleId: uuid('rule_id').references(() => recallRules.id, { onDelete: 'set null' }),
  treatmentRecordId: uuid('treatment_record_id').references(() => treatmentRecords.id, { onDelete: 'set null' }),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  status: recallStatusEnum('status').notNull().default('upcoming'),
  lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
  dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
  overrideReason: text('override_reason'),
  bookedAppointmentId: uuid('booked_appointment_id'),
  ...timestamps,
}, (t) => ({ clinicDueIdx: index('patient_recalls_clinic_due_idx').on(t.clinicId, t.dueAt), patientIdx: index('patient_recalls_patient_idx').on(t.clinicId, t.patientId), treatmentUnique: unique('patient_recalls_treatment_unique').on(t.treatmentRecordId) }));

export type RecallRule = typeof recallRules.$inferSelect;
export type PatientRecall = typeof patientRecalls.$inferSelect;
