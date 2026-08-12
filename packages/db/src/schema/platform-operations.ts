import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { id, timestamps } from './helpers';

export const supportAccessStatusEnum = pgEnum('support_access_status', ['pending', 'approved', 'denied', 'expired', 'used']);
export const tenantExportStatusEnum = pgEnum('tenant_export_status', ['requested', 'processing', 'ready', 'failed', 'cancelled']);

export const supportAccessRequests = pgTable('support_access_requests', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  requestedBy: uuid('requested_by').notNull(),
  reason: text('reason').notNull(),
  status: supportAccessStatusEnum('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...timestamps,
}, (t) => ({ clinicIdx: index('support_access_clinic_idx').on(t.clinicId, t.status), statusIdx: index('support_access_status_idx').on(t.status) }));

export const tenantExportRequests = pgTable('tenant_export_requests', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  requestedBy: uuid('requested_by').notNull(),
  status: tenantExportStatusEnum('status').notNull().default('requested'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  retentionUntil: timestamp('retention_until', { withTimezone: true }),
  failureReason: text('failure_reason'),
  artifactReference: varchar('artifact_reference', { length: 500 }),
  ...timestamps,
}, (t) => ({ clinicIdx: index('tenant_export_clinic_idx').on(t.clinicId, t.status), statusIdx: index('tenant_export_status_idx').on(t.status) }));

export type SupportAccessRequest = typeof supportAccessRequests.$inferSelect;
export type TenantExportRequest = typeof tenantExportRequests.$inferSelect;
