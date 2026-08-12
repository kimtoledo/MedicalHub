import { index, integer, jsonb, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { clinicalFiles } from './clinical-files';
import { encounters } from './encounters';
import { patients } from './patients';
import { users } from './users';
import { id, timestamps } from './helpers';

export const aiImagingStatusEnum = pgEnum('ai_imaging_status', ['queued', 'completed', 'failed']);
export const aiImagingAnalyses = pgTable('ai_imaging_analyses', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  fileId: uuid('file_id').notNull().references(() => clinicalFiles.id, { onDelete: 'restrict' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict' }),
  encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
  model: varchar('model', { length: 100 }).notNull(),
  status: aiImagingStatusEnum('status').notNull().default('queued'),
  findings: jsonb('findings').$type<Array<{ label: string; confidence: number; advisory: true }>>().notNull().default([]),
  oralHealthScore: integer('oral_health_score'),
  confirmedBy: uuid('confirmed_by').references(() => users.id, { onDelete: 'set null' }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  failureReason: varchar('failure_reason', { length: 300 }),
  ...timestamps,
}, (t) => ({ clinicIdx: index('ai_imaging_clinic_idx').on(t.clinicId, t.status), fileIdx: index('ai_imaging_file_idx').on(t.fileId), patientIdx: index('ai_imaging_patient_idx').on(t.patientId) }));

export type AiImagingAnalysis = typeof aiImagingAnalyses.$inferSelect;
