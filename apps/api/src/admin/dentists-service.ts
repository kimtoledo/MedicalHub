import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import type { DB } from '@dentra/db';
import {
  clinics,
  dentistBranchAssignments,
  dentists,
} from '@dentra/db/schema';

export type DentistVerificationStatus =
  typeof dentists.$inferSelect.verificationStatus;

export type ListAdminDentistsInput = {
  search: string;
  verificationStatus?: DentistVerificationStatus;
  page: number;
  pageSize: number;
};

export type AdminDentistListItem = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  licenseNumber: string | null;
  specialty: string | null;
  verificationStatus: DentistVerificationStatus;
  publicationStatus: string;
  affiliatedClinicCount: number;
  createdAt: Date;
};

export type AdminDentistListResult = {
  items: AdminDentistListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AdminDentistListService = {
  list: (input: ListAdminDentistsInput) => Promise<AdminDentistListResult>;
};

export function createAdminDentistListService(
  database: DB,
): AdminDentistListService {
  return {
    list: async (input) => {
      const search = input.search.trim();
      const searchTerm = `%${search}%`;
      const searchCondition = search
        ? or(
            ilike(dentists.firstName, searchTerm),
            ilike(dentists.lastName, searchTerm),
            ilike(dentists.slug, searchTerm),
            ilike(dentists.licenseNumber, searchTerm),
            ilike(dentists.email, searchTerm),
            sql`concat(${dentists.firstName}, ' ', ${dentists.lastName}) ilike ${searchTerm}`,
          )
        : undefined;
      const where = and(
        isNull(dentists.deletedAt),
        input.verificationStatus
          ? eq(dentists.verificationStatus, input.verificationStatus)
          : undefined,
        searchCondition,
      );

      const [totalRow] = await database
        .select({ total: count(dentists.id) })
        .from(dentists)
        .where(where);
      const total = totalRow?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
      const page = Math.min(input.page, totalPages);

      const dentistRows = await database
        .select({
          id: dentists.id,
          firstName: dentists.firstName,
          lastName: dentists.lastName,
          slug: dentists.slug,
          licenseNumber: dentists.licenseNumber,
          specialty: dentists.specialty,
          verificationStatus: dentists.verificationStatus,
          publicationStatus: dentists.publicationStatus,
          createdAt: dentists.createdAt,
        })
        .from(dentists)
        .where(where)
        .orderBy(desc(dentists.createdAt), dentists.lastName, dentists.firstName)
        .limit(input.pageSize)
        .offset((page - 1) * input.pageSize);

      if (dentistRows.length === 0) {
        return {
          items: [],
          pagination: { page, pageSize: input.pageSize, total, totalPages },
        };
      }

      const affiliationRows = await database
        .select({
          dentistId: dentistBranchAssignments.dentistId,
          affiliatedClinicCount: countDistinct(dentistBranchAssignments.clinicId),
        })
        .from(dentistBranchAssignments)
        .innerJoin(
          clinics,
          eq(dentistBranchAssignments.clinicId, clinics.id),
        )
        .where(
          and(
            inArray(
              dentistBranchAssignments.dentistId,
              dentistRows.map((dentist) => dentist.id),
            ),
            eq(dentistBranchAssignments.isActive, 'true'),
            isNull(clinics.deletedAt),
          ),
        )
        .groupBy(dentistBranchAssignments.dentistId);

      const affiliationCounts = new Map(
        affiliationRows.map((row) => [
          row.dentistId,
          row.affiliatedClinicCount,
        ]),
      );

      return {
        items: dentistRows.map((dentist) => ({
          ...dentist,
          affiliatedClinicCount: affiliationCounts.get(dentist.id) ?? 0,
        })),
        pagination: { page, pageSize: input.pageSize, total, totalPages },
      };
    },
  };
}
