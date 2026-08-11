import { boolean, index, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { id, timestamps } from './helpers';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trial',
  'active',
  'past_due',
  'cancelled',
  'expired',
]);

/**
 * packages — subscription plans available on the platform.
 * Do NOT use package names as authorization rules — use feature_key.
 */
export const packages = pgTable(
  'packages',
  {
    id: id(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 80 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: varchar('sort_order', { length: 10 }).default('0'),
    ...timestamps,
  },
  (t) => ({
    slugUnique: unique('packages_slug_unique').on(t.slug),
  }),
);

/**
 * package_features — which feature keys are included in each package.
 * This is the authoritative entitlement source for a package.
 */
export const packageFeatures = pgTable(
  'package_features',
  {
    id: id(),
    packageId: uuid('package_id')
      .notNull()
      .references(() => packages.id, { onDelete: 'cascade' }),
    /** Must be a value from FeatureKey enum in @dentra/shared */
    featureKey: varchar('feature_key', { length: 100 }).notNull(),
    isEnabled: boolean('is_enabled').notNull().default(true),
    ...timestamps,
  },
  (t) => ({
    packageIdx: index('pkg_features_package_id_idx').on(t.packageId),
  }),
);

/**
 * clinic_subscriptions — which package a clinic is subscribed to.
 */
export const clinicSubscriptions = pgTable(
  'clinic_subscriptions',
  {
    id: id(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    packageId: uuid('package_id')
      .notNull()
      .references(() => packages.id),
    status: subscriptionStatusEnum('status').notNull().default('trial'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    assignedBy: uuid('assigned_by'),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => ({
    clinicIdx: index('subscriptions_clinic_id_idx').on(t.clinicId),
    statusIdx: index('subscriptions_status_idx').on(t.status),
  }),
);

/**
 * clinic_feature_overrides — per-clinic overrides to package entitlements.
 * Super Admin can grant or revoke specific features with a reason.
 * These are evaluated AFTER the base package entitlements.
 */
export const clinicFeatureOverrides = pgTable(
  'clinic_feature_overrides',
  {
    id: id(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    featureKey: varchar('feature_key', { length: 100 }).notNull(),
    isEnabled: boolean('is_enabled').notNull(),
    reason: text('reason').notNull(),
    grantedBy: uuid('granted_by').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    clinicFeatureIdx: index('overrides_clinic_feature_idx').on(t.clinicId, t.featureKey),
  }),
);

export type Package = typeof packages.$inferSelect;
export type ClinicSubscription = typeof clinicSubscriptions.$inferSelect;
export type ClinicFeatureOverride = typeof clinicFeatureOverrides.$inferSelect;
