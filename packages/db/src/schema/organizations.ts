import { boolean, index, numeric, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { users } from './users';
import { id, timestamps } from './helpers';
export const organizationRoleEnum = pgEnum('organization_role', ['owner', 'admin', 'regional_manager', 'viewer']);
export const organizations = pgTable('organizations', { id: id(), name: varchar('name', { length: 200 }).notNull(), slug: varchar('slug', { length: 100 }).notNull(), description: text('description'), ...timestamps }, (t) => ({ slugUnique: unique('organizations_slug_unique').on(t.slug) }));
export const organizationClinics = pgTable('organization_clinics', { id: id(), organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }), clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }), ...timestamps }, (t) => ({ organizationIdx: index('organization_clinics_org_idx').on(t.organizationId), clinicIdx: index('organization_clinics_clinic_idx').on(t.clinicId), uniqueClinic: unique('organization_clinic_unique').on(t.clinicId) }));
export const organizationMemberships = pgTable('organization_memberships', { id: id(), organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), role: organizationRoleEnum('role').notNull(), branchIds: text('branch_ids').notNull().default('[]'), ...timestamps }, (t) => ({ organizationIdx: index('organization_memberships_org_idx').on(t.organizationId), userIdx: index('organization_memberships_user_idx').on(t.userId), uniqueMember: unique('organization_member_unique').on(t.organizationId, t.userId) }));

/**
 * organization_services — a dental group's shared, central service catalog.
 * Member clinics "adopt" an item (packages/db/src/schema/appointments.ts's
 * `services.organizationServiceId`) to seed their own clinic-level service
 * with this base price; the clinic (and its branches) can still override it
 * via the existing servicePriceHistory mechanism — this only adds one more
 * fallback tier below the existing clinic-base tier, it never overrides a
 * clinic's own price.
 */
export const organizationServices = pgTable('organization_services', {
  id: id(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  durationMinutes: varchar('duration_minutes', { length: 10 }).notNull(),
  basePricePhp: numeric('base_price_php', { precision: 10, scale: 2 }),
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  ...timestamps,
}, (t) => ({ organizationIdx: index('organization_services_org_idx').on(t.organizationId) }));

export type OrganizationServiceCatalogItem = typeof organizationServices.$inferSelect;

/**
 * organization_entitlements — an org-wide default grant/revoke for a
 * feature key, evaluated by entitlements/service.ts's resolve() as a
 * fallback tier BELOW a clinic's own explicit override and package base:
 * override -> package base -> organization grant -> unavailable. A clinic
 * with its own override or a package that already covers the feature is
 * never silently overridden by an org-wide grant; this only fills the gap
 * when the clinic's own subscription doesn't already have an opinion.
 */
export const organizationEntitlements = pgTable('organization_entitlements', {
  id: id(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  featureKey: varchar('feature_key', { length: 100 }).notNull(),
  isEnabled: boolean('is_enabled').notNull(),
  grantedBy: uuid('granted_by').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  ...timestamps,
}, (t) => ({
  orgFeatureUnique: unique('organization_entitlements_org_feature_unique').on(t.organizationId, t.featureKey),
}));

export type OrganizationEntitlement = typeof organizationEntitlements.$inferSelect;
