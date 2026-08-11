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
  auditEvents,
  clinics,
  dentistBranchAssignments,
  dentists,
} from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';

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

export type CreateAdminDentistInput = {
  firstName: string;
  lastName: string;
  slug: string;
  licenseNumber: string | null;
  specialty: string | null;
};

export type CreateAdminDentistActor = {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

export type CreatedAdminDentist = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  licenseNumber: string | null;
  specialty: string | null;
  verificationStatus: DentistVerificationStatus;
  publicationStatus: string;
  createdAt: Date;
};

export class AdminDentistCreationError extends Error {
  constructor(
    public readonly code: 'SLUG_TAKEN',
    message: string,
  ) {
    super(message);
    this.name = 'AdminDentistCreationError';
  }
}

export type AdminDentistCreationService = {
  create: (
    input: CreateAdminDentistInput,
    actor: CreateAdminDentistActor,
  ) => Promise<CreatedAdminDentist>;
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

function isDentistSlugConstraint(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const databaseError = error as {
    code?: unknown;
    constraint_name?: unknown;
  };
  return databaseError.code === '23505' &&
    databaseError.constraint_name === 'dentists_slug_unique';
}

export function createAdminDentistCreationService(
  database: DB,
): AdminDentistCreationService {
  return {
    create: async (input, actor) => {
      try {
        return await database.transaction(async (transaction) => {
          const [duplicateDentist] = await transaction
            .select({ id: dentists.id })
            .from(dentists)
            .where(eq(dentists.slug, input.slug))
            .limit(1);

          if (duplicateDentist) {
            throw new AdminDentistCreationError(
              'SLUG_TAKEN',
              'That dentist slug is already in use',
            );
          }

          const [createdDentist] = await transaction
            .insert(dentists)
            .values({
              firstName: input.firstName,
              lastName: input.lastName,
              slug: input.slug,
              licenseNumber: input.licenseNumber,
              specialty: input.specialty,
              verificationStatus: 'unverified',
              publicationStatus: 'draft',
            })
            .returning({
              id: dentists.id,
              firstName: dentists.firstName,
              lastName: dentists.lastName,
              slug: dentists.slug,
              licenseNumber: dentists.licenseNumber,
              specialty: dentists.specialty,
              verificationStatus: dentists.verificationStatus,
              publicationStatus: dentists.publicationStatus,
              createdAt: dentists.createdAt,
            });

          await transaction.insert(auditEvents).values({
            actorId: actor.id,
            actorEmail: actor.email,
            entityType: 'dentist',
            entityId: createdDentist.id,
            action: AuditAction.DENTIST_CREATED,
            metadata: JSON.stringify({
              verificationStatus: createdDentist.verificationStatus,
              publicationStatus: createdDentist.publicationStatus,
            }),
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent,
          });

          return createdDentist;
        });
      } catch (error) {
        if (error instanceof AdminDentistCreationError) throw error;
        if (isDentistSlugConstraint(error)) {
          throw new AdminDentistCreationError(
            'SLUG_TAKEN',
            'That dentist slug is already in use',
          );
        }
        throw error;
      }
    },
  };
}
