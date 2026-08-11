import { and, countDistinct, desc, eq, gt, inArray, isNull, lte, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { clinicSubscriptions, packageFeatures, packages } from '@dentra/db/schema';
import { AuditAction, FeatureKey } from '@dentra/shared';

export type AdminPackageItem = {
  id: string; name: string; slug: string; description: string | null;
  priceDisplay: string; isActive: boolean; sortOrder: string | null;
  featureKeys: string[]; activeClinicCount: number;
};
export type SaveAdminPackageInput = {
  name: string; slug: string; description: string | null; priceDisplay: string;
  isActive: boolean; featureKeys: FeatureKey[];
};
export type AdminPackageActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export class AdminPackageError extends Error {
  constructor(public readonly code: 'PACKAGE_NOT_FOUND' | 'SLUG_TAKEN', message: string) { super(message); this.name = 'AdminPackageError'; }
}
export type AdminPackageService = {
  list: () => Promise<AdminPackageItem[]>;
  create: (input: SaveAdminPackageInput, actor: AdminPackageActor) => Promise<AdminPackageItem>;
  update: (packageId: string, input: SaveAdminPackageInput, actor: AdminPackageActor) => Promise<AdminPackageItem>;
};

function isSlugConstraint(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as { code?: unknown; constraint_name?: unknown };
  return value.code === '23505' && value.constraint_name === 'packages_slug_unique';
}

export function createAdminPackageService(database: DB): AdminPackageService {
  const list = async (): Promise<AdminPackageItem[]> => {
    const now = new Date();
    const [packageRows, featureRows, clinicRows] = await Promise.all([
      database.select({ id: packages.id, name: packages.name, slug: packages.slug, description: packages.description, priceDisplay: packages.priceDisplay, isActive: packages.isActive, sortOrder: packages.sortOrder }).from(packages).orderBy(packages.sortOrder, packages.name),
      database.select({ packageId: packageFeatures.packageId, featureKey: packageFeatures.featureKey }).from(packageFeatures).where(eq(packageFeatures.isEnabled, true)).orderBy(packageFeatures.featureKey),
      database.select({ packageId: clinicSubscriptions.packageId, activeClinicCount: countDistinct(clinicSubscriptions.clinicId) }).from(clinicSubscriptions).where(and(inArray(clinicSubscriptions.status, ['trial', 'active']), lte(clinicSubscriptions.startsAt, now), or(isNull(clinicSubscriptions.expiresAt), gt(clinicSubscriptions.expiresAt, now)))).groupBy(clinicSubscriptions.packageId),
    ]);
    const features = new Map<string, string[]>();
    featureRows.forEach((row) => features.set(row.packageId, [...(features.get(row.packageId) ?? []), row.featureKey]));
    const counts = new Map(clinicRows.map((row) => [row.packageId, row.activeClinicCount]));
    return packageRows.map((row) => ({ ...row, featureKeys: features.get(row.id) ?? [], activeClinicCount: counts.get(row.id) ?? 0 }));
  };

  async function save(packageId: string | null, input: SaveAdminPackageInput, actor: AdminPackageActor): Promise<AdminPackageItem> {
    try {
      const savedId = await database.transaction(async (transaction) => {
        const [duplicate] = await transaction.select({ id: packages.id }).from(packages).where(eq(packages.slug, input.slug)).limit(1);
        if (duplicate && duplicate.id !== packageId) throw new AdminPackageError('SLUG_TAKEN', 'That package slug is already in use');
        let id = packageId;
        let wasActive = false;
        if (id) {
          const [current] = await transaction.select({ isActive: packages.isActive }).from(packages).where(eq(packages.id, id)).limit(1);
          if (!current) throw new AdminPackageError('PACKAGE_NOT_FOUND', 'Package not found');
          wasActive = current.isActive;
          await transaction.update(packages).set({ name: input.name, slug: input.slug, description: input.description, priceDisplay: input.priceDisplay, isActive: input.isActive }).where(eq(packages.id, id));
          await transaction.delete(packageFeatures).where(eq(packageFeatures.packageId, id));
        } else {
          const [created] = await transaction.insert(packages).values({ name: input.name, slug: input.slug, description: input.description, priceDisplay: input.priceDisplay, isActive: input.isActive }).returning({ id: packages.id });
          id = created.id;
        }
        if (input.featureKeys.length) await transaction.insert(packageFeatures).values(input.featureKeys.map((featureKey) => ({ packageId: id!, featureKey, isEnabled: true })));
        const action = packageId
          ? (wasActive && !input.isActive ? AuditAction.PACKAGE_DEACTIVATED : AuditAction.PACKAGE_UPDATED)
          : AuditAction.PACKAGE_CREATED;
        await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, entityType: 'package', entityId: id, action, metadata: JSON.stringify({ featureKeys: input.featureKeys, isActive: input.isActive }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        return id!;
      });
      const item = (await list()).find((candidate) => candidate.id === savedId);
      if (!item) throw new AdminPackageError('PACKAGE_NOT_FOUND', 'Package not found after save');
      return item;
    } catch (error) {
      if (error instanceof AdminPackageError) throw error;
      if (isSlugConstraint(error)) throw new AdminPackageError('SLUG_TAKEN', 'That package slug is already in use');
      throw error;
    }
  }

  return { list, create: (input, actor) => save(null, input, actor), update: (id, input, actor) => save(id, input, actor) };
}
