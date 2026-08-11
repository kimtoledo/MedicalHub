import { and, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { clinics, clinicSubscriptions, packages } from '@dentra/db/schema';

export type SubscriptionStatus = typeof clinicSubscriptions.$inferSelect.status;
export type ListAdminSubscriptionsInput = { search: string; status?: SubscriptionStatus; packageId?: string; page: number; pageSize: number };
export type AdminSubscriptionListItem = {
  id: string; clinicId: string; clinicName: string; clinicSlug: string;
  packageId: string; packageName: string; packageSlug: string;
  status: SubscriptionStatus; startsAt: Date; expiresAt: Date | null; createdAt: Date;
  isCurrent: boolean;
};
export type AdminSubscriptionListResult = {
  items: AdminSubscriptionListItem[];
  packageOptions: Array<{ id: string; name: string }>;
  assignmentPackageOptions: Array<{ id: string; name: string; slug: string }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
export type AdminSubscriptionListService = { list: (input: ListAdminSubscriptionsInput) => Promise<AdminSubscriptionListResult> };

export function createAdminSubscriptionListService(database: DB): AdminSubscriptionListService {
  return { list: async (input) => {
    const term = `%${input.search.trim()}%`;
    const where = and(
      isNull(clinics.deletedAt),
      input.search ? or(ilike(clinics.name, term), ilike(clinics.slug, term), ilike(packages.name, term)) : undefined,
      input.status ? eq(clinicSubscriptions.status, input.status) : undefined,
      input.packageId ? eq(clinicSubscriptions.packageId, input.packageId) : undefined,
    );
    const [totalRow, packageOptions, assignmentPackageOptions] = await Promise.all([
      database.select({ total: count(clinicSubscriptions.id) }).from(clinicSubscriptions).innerJoin(clinics, eq(clinicSubscriptions.clinicId, clinics.id)).innerJoin(packages, eq(clinicSubscriptions.packageId, packages.id)).where(where),
      database.select({ id: packages.id, name: packages.name }).from(packages).orderBy(packages.name),
      database.select({ id: packages.id, name: packages.name, slug: packages.slug }).from(packages).where(eq(packages.isActive, true)).orderBy(packages.name),
    ]);
    const total = totalRow[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
    const page = Math.min(input.page, totalPages);
    const rows = await database.select({
      id: clinicSubscriptions.id, clinicId: clinics.id, clinicName: clinics.name, clinicSlug: clinics.slug,
      packageId: packages.id, packageName: packages.name, packageSlug: packages.slug,
      status: clinicSubscriptions.status, startsAt: clinicSubscriptions.startsAt, expiresAt: clinicSubscriptions.expiresAt, createdAt: clinicSubscriptions.createdAt,
    }).from(clinicSubscriptions).innerJoin(clinics, eq(clinicSubscriptions.clinicId, clinics.id)).innerJoin(packages, eq(clinicSubscriptions.packageId, packages.id)).where(where).orderBy(desc(clinicSubscriptions.startsAt), clinics.name).limit(input.pageSize).offset((page - 1) * input.pageSize);
    const items = rows.map((row) => ({
      ...row,
      isCurrent:
        (row.status === 'trial' || row.status === 'active') &&
        row.startsAt <= new Date() &&
        (!row.expiresAt || row.expiresAt > new Date()),
    }));
    return { items, packageOptions, assignmentPackageOptions, pagination: { page, pageSize: input.pageSize, total, totalPages } };
  } };
}
