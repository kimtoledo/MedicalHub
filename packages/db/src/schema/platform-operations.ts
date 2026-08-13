import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
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

// Rolling out a new feature to a subset of clinics before full release.
// enabledByDefault === true means every clinic gets it (full release);
// otherwise only clinics with a row in featureFlagClinics get it.
export const featureFlags = pgTable('feature_flags', {
  id: id(),
  key: varchar('key', { length: 100 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  enabledByDefault: boolean('enabled_by_default').notNull().default(false),
  ...timestamps,
}, (t) => ({ keyUnique: uniqueIndex('feature_flags_key_unique').on(t.key) }));

export const featureFlagClinics = pgTable('feature_flag_clinics', {
  id: id(),
  flagId: uuid('flag_id').notNull().references(() => featureFlags.id, { onDelete: 'cascade' }),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  ...timestamps,
}, (t) => ({
  flagClinicUnique: uniqueIndex('feature_flag_clinics_unique').on(t.flagId, t.clinicId),
  clinicIdx: index('feature_flag_clinics_clinic_idx').on(t.clinicId),
}));

export type SupportAccessRequest = typeof supportAccessRequests.$inferSelect;
export type TenantExportRequest = typeof tenantExportRequests.$inferSelect;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type FeatureFlagClinic = typeof featureFlagClinics.$inferSelect;
