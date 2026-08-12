import { index, integer, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { packages } from './subscriptions';
import { id, timestamps } from './helpers';

export const subscriptionRequestTypeEnum = pgEnum('subscription_request_type', ['upgrade', 'downgrade', 'addon']);
export const subscriptionRequestStatusEnum = pgEnum('subscription_request_status', ['pending', 'approved', 'rejected', 'cancelled']);

export const subscriptionChangeRequests = pgTable('subscription_change_requests', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  requestedPackageId: uuid('requested_package_id').references(() => packages.id, { onDelete: 'set null' }),
  type: subscriptionRequestTypeEnum('type').notNull(),
  reason: text('reason').notNull(),
  status: subscriptionRequestStatusEnum('status').notNull().default('pending'),
  requestedBy: uuid('requested_by').notNull(),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: text('review_note'),
  ...timestamps,
}, (t) => ({ clinicIdx: index('subscription_requests_clinic_idx').on(t.clinicId, t.status), statusIdx: index('subscription_requests_status_idx').on(t.status) }));

export const clinicUsageCounters = pgTable('clinic_usage_counters', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  metric: varchar('metric', { length: 60 }).notNull(),
  periodKey: varchar('period_key', { length: 20 }).notNull(),
  used: integer('used').notNull().default(0),
  limit: integer('limit'),
  ...timestamps,
}, (t) => ({ metricUnique: unique('clinic_usage_metric_period_unique').on(t.clinicId, t.metric, t.periodKey), clinicIdx: index('clinic_usage_clinic_idx').on(t.clinicId, t.periodKey) }));

export type SubscriptionChangeRequest = typeof subscriptionChangeRequests.$inferSelect;
export type ClinicUsageCounter = typeof clinicUsageCounters.$inferSelect;
