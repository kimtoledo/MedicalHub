import { and, desc, eq, gt, isNull, lte, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { clinicFeatureOverrides, clinics, clinicSubscriptions, organizationClinics, organizationEntitlements, packageFeatures, packages } from '@dentra/db/schema';
import { FeatureKey } from '@dentra/shared';

export type ClinicEntitlements = {
  clinic: { id: string; name: string; status: string };
  subscription: { id: string; status: string; package: { id: string; name: string; slug: string } } | null;
  entitlements: Array<{ featureKey: FeatureKey; isEnabled: boolean; source: 'package' | 'override' | 'organization' | 'unavailable'; expiresAt: Date | null }>;
};
export type EntitlementService = { resolve: (clinicId: string) => Promise<ClinicEntitlements | null> };

export function createEntitlementService(database: DB): EntitlementService {
  return { resolve: async (clinicId) => {
    const [clinic] = await database.select({ id: clinics.id, name: clinics.name, status: clinics.status }).from(clinics).where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt))).limit(1);
    if (!clinic) return null;
    const now = new Date();
    const [subscriptions, overrides, orgLink] = await Promise.all([
      database.select({ id: clinicSubscriptions.id, status: clinicSubscriptions.status, packageId: packages.id, packageName: packages.name, packageSlug: packages.slug }).from(clinicSubscriptions).innerJoin(packages, eq(clinicSubscriptions.packageId, packages.id)).where(and(eq(clinicSubscriptions.clinicId, clinicId), lte(clinicSubscriptions.startsAt, now), or(isNull(clinicSubscriptions.expiresAt), gt(clinicSubscriptions.expiresAt, now)))).orderBy(desc(clinicSubscriptions.startsAt)).limit(1),
      database.select({ featureKey: clinicFeatureOverrides.featureKey, isEnabled: clinicFeatureOverrides.isEnabled, expiresAt: clinicFeatureOverrides.expiresAt, createdAt: clinicFeatureOverrides.createdAt }).from(clinicFeatureOverrides).where(and(eq(clinicFeatureOverrides.clinicId, clinicId), or(isNull(clinicFeatureOverrides.expiresAt), gt(clinicFeatureOverrides.expiresAt, now)))).orderBy(desc(clinicFeatureOverrides.createdAt)),
      database.select({ organizationId: organizationClinics.organizationId }).from(organizationClinics).where(eq(organizationClinics.clinicId, clinicId)).limit(1),
    ]);
    const subscription = subscriptions[0];
    const baseRows = subscription ? await database.select({ featureKey: packageFeatures.featureKey, isEnabled: packageFeatures.isEnabled }).from(packageFeatures).where(eq(packageFeatures.packageId, subscription.packageId)) : [];
    const base = new Map(baseRows.map((row) => [row.featureKey, row.isEnabled]));
    const latestOverrides = new Map<string, (typeof overrides)[number]>();
    overrides.forEach((row) => { if (!latestOverrides.has(row.featureKey)) latestOverrides.set(row.featureKey, row); });
    const orgGrants = orgLink[0] ? new Map((await database.select({ featureKey: organizationEntitlements.featureKey, isEnabled: organizationEntitlements.isEnabled, expiresAt: organizationEntitlements.expiresAt }).from(organizationEntitlements).where(and(eq(organizationEntitlements.organizationId, orgLink[0].organizationId), or(isNull(organizationEntitlements.expiresAt), gt(organizationEntitlements.expiresAt, now))))).map((row) => [row.featureKey, row])) : new Map();
    const entitlements = Object.values(FeatureKey).map((featureKey) => {
      const override = latestOverrides.get(featureKey);
      if (override) return { featureKey, isEnabled: override.isEnabled, source: 'override' as const, expiresAt: override.expiresAt };
      if (base.has(featureKey)) return { featureKey, isEnabled: base.get(featureKey) ?? false, source: 'package' as const, expiresAt: null };
      const orgGrant = orgGrants.get(featureKey);
      if (orgGrant) return { featureKey, isEnabled: orgGrant.isEnabled, source: 'organization' as const, expiresAt: orgGrant.expiresAt };
      return { featureKey, isEnabled: false, source: 'unavailable' as const, expiresAt: null };
    });
    return { clinic, subscription: subscription ? { id: subscription.id, status: subscription.status, package: { id: subscription.packageId, name: subscription.packageName, slug: subscription.packageSlug } } : null, entitlements };
  } };
}
