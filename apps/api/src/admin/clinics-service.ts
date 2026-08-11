import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
} from 'drizzle-orm';
import type { DB } from '@toothhub/db';
import {
  branches,
  clinics,
  clinicSubscriptions,
  packages,
} from '@toothhub/db/schema';

export type ClinicStatus = typeof clinics.$inferSelect.status;

export type ListAdminClinicsInput = {
  search: string;
  status?: ClinicStatus;
  page: number;
  pageSize: number;
};

export type AdminClinicListItem = {
  id: string;
  name: string;
  slug: string;
  prefix: string;
  status: ClinicStatus;
  publicationStatus: typeof clinics.$inferSelect.publicationStatus;
  packageName: string | null;
  branchCount: number;
  createdAt: Date;
};

export type AdminClinicListResult = {
  items: AdminClinicListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AdminClinicListService = {
  list: (input: ListAdminClinicsInput) => Promise<AdminClinicListResult>;
};

export function createAdminClinicListService(
  database: DB,
): AdminClinicListService {
  return {
    list: async (input) => {
      const search = input.search.trim();
      const searchCondition = search
        ? or(
            ilike(clinics.name, `%${search}%`),
            ilike(clinics.slug, `%${search}%`),
            ilike(clinics.prefix, `%${search}%`),
          )
        : undefined;
      const where = and(
        isNull(clinics.deletedAt),
        input.status ? eq(clinics.status, input.status) : undefined,
        searchCondition,
      );

      const [totalRow] = await database
        .select({ total: count(clinics.id) })
        .from(clinics)
        .where(where);
      const total = totalRow?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
      const page = Math.min(input.page, totalPages);

      const clinicRows = await database
        .select({
          id: clinics.id,
          name: clinics.name,
          slug: clinics.slug,
          prefix: clinics.prefix,
          status: clinics.status,
          publicationStatus: clinics.publicationStatus,
          createdAt: clinics.createdAt,
        })
        .from(clinics)
        .where(where)
        .orderBy(desc(clinics.createdAt), clinics.name)
        .limit(input.pageSize)
        .offset((page - 1) * input.pageSize);

      if (clinicRows.length === 0) {
        return {
          items: [],
          pagination: { page, pageSize: input.pageSize, total, totalPages },
        };
      }

      const clinicIds = clinicRows.map((clinic) => clinic.id);
      const [branchRows, subscriptionRows] = await Promise.all([
        database
          .select({
            clinicId: branches.clinicId,
            branchCount: count(branches.id),
          })
          .from(branches)
          .where(
            and(
              inArray(branches.clinicId, clinicIds),
              isNull(branches.deletedAt),
            ),
          )
          .groupBy(branches.clinicId),
        database
          .select({
            clinicId: clinicSubscriptions.clinicId,
            packageName: packages.name,
          })
          .from(clinicSubscriptions)
          .innerJoin(packages, eq(clinicSubscriptions.packageId, packages.id))
          .where(inArray(clinicSubscriptions.clinicId, clinicIds))
          .orderBy(desc(clinicSubscriptions.startsAt)),
      ]);

      const branchCounts = new Map(
        branchRows.map((row) => [row.clinicId, row.branchCount]),
      );
      const packageNames = new Map<string, string>();
      subscriptionRows.forEach((row) => {
        if (!packageNames.has(row.clinicId)) {
          packageNames.set(row.clinicId, row.packageName);
        }
      });

      return {
        items: clinicRows.map((clinic) => ({
          ...clinic,
          packageName: packageNames.get(clinic.id) ?? null,
          branchCount: branchCounts.get(clinic.id) ?? 0,
        })),
        pagination: { page, pageSize: input.pageSize, total, totalPages },
      };
    },
  };
}
