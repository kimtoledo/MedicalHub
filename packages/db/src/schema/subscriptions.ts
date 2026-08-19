import { boolean, index, integer, numeric, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
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
    /** Human-readable manual price shown in admin/public plan cards. */
    priceDisplay: varchar('price_display', { length: 50 })
      .notNull()
      .default('Contact us'),
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
    packageFeatureUnique: unique('package_features_package_key_unique').on(
      t.packageId,
      t.featureKey,
    ),
  }),
);

/**
 * package_limits — per-package default capacity caps (headcount), keyed by
 * CapacityMetric. Mirrors package_features exactly, but for numeric limits
 * instead of boolean feature grants.
 *
 * Absent row = 0 (deny-by-default, same rule package_features already
 * applies to an absent feature key). limit = NULL is an explicit,
 * never-implied "unlimited" sentinel.
 */
export const packageLimits = pgTable(
  'package_limits',
  {
    id: id(),
    packageId: uuid('package_id')
      .notNull()
      .references(() => packages.id, { onDelete: 'cascade' }),
    /** Must be a value from CapacityMetric enum in @dentra/shared */
    metric: varchar('metric', { length: 60 }).notNull(),
    /** NULL = unlimited. */
    limit: integer('limit'),
    ...timestamps,
  },
  (t) => ({
    packageIdx: index('pkg_limits_package_id_idx').on(t.packageId),
    packageMetricUnique: unique('package_limits_package_metric_unique').on(
      t.packageId,
      t.metric,
    ),
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
    /** BRANCHES-tier negotiated price. NULL = use packages.priceDisplay. */
    negotiatedPricePhp: numeric('negotiated_price_php', { precision: 10, scale: 2 }),
    billingNote: text('billing_note'),
    ...timestamps,
  },
  (t) => ({
    clinicIdx: index('subscriptions_clinic_id_idx').on(t.clinicId),
    statusIdx: index('subscriptions_status_idx').on(t.status),
  }),
);

/**
 * clinic_limit_overrides — per-clinic overrides to package capacity limits.
 * Super Admin can grant a different limit with a reason. Evaluated BEFORE
 * package_limits (override -> package base -> 0), mirroring
 * clinic_feature_overrides exactly. This table is also the entire
 * BRANCHES-tier configuration mechanism: a BRANCHES clinic is a package with
 * 0 baseline limits plus one override row per metric set by Super Admin.
 */
export const clinicLimitOverrides = pgTable(
  'clinic_limit_overrides',
  {
    id: id(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    metric: varchar('metric', { length: 60 }).notNull(),
    /** NULL = unlimited. */
    limit: integer('limit'),
    reason: text('reason').notNull(),
    grantedBy: uuid('granted_by').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    clinicMetricIdx: index('limit_overrides_clinic_metric_idx').on(t.clinicId, t.metric),
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
export type PackageLimit = typeof packageLimits.$inferSelect;
export type ClinicLimitOverride = typeof clinicLimitOverrides.$inferSelect;
