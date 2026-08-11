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
import type { DB } from '@dentra/db';
import {
  auditEvents,
  branches,
  clinicMemberships,
  clinics,
  clinicSubscriptions,
  packages,
  users,
} from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';

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

export type AdminClinicPackageOption = {
  id: string;
  name: string;
  slug: string;
};

export type CreateAdminClinicInput = {
  name: string;
  slug: string;
  prefix: string;
  ownerEmail: string;
  packageId: string;
};

export type CreateAdminClinicActor = {
  id: string;
  email: string;
};

export type CreatedAdminClinic = {
  id: string;
  name: string;
  slug: string;
  prefix: string;
  status: ClinicStatus;
  ownerUserId: string;
  packageId: string;
  createdAt: Date;
};

export type AdminClinicCreationErrorCode =
  | 'SLUG_TAKEN'
  | 'PREFIX_TAKEN'
  | 'PACKAGE_NOT_AVAILABLE'
  | 'OWNER_NOT_AVAILABLE';

export class AdminClinicCreationError extends Error {
  constructor(
    public readonly code: AdminClinicCreationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminClinicCreationError';
  }
}

export type AdminClinicCreationService = {
  listPackageOptions: () => Promise<AdminClinicPackageOption[]>;
  create: (
    input: CreateAdminClinicInput,
    actor: CreateAdminClinicActor,
  ) => Promise<CreatedAdminClinic>;
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

function getUniqueConstraint(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const databaseError = error as {
    code?: unknown;
    constraint_name?: unknown;
  };

  if (databaseError.code !== '23505') {
    return undefined;
  }

  return typeof databaseError.constraint_name === 'string'
    ? databaseError.constraint_name
    : undefined;
}

export function createAdminClinicCreationService(
  database: DB,
): AdminClinicCreationService {
  return {
    listPackageOptions: async () => database
      .select({
        id: packages.id,
        name: packages.name,
        slug: packages.slug,
      })
      .from(packages)
      .where(eq(packages.isActive, true))
      .orderBy(packages.sortOrder, packages.name),

    create: async (input, actor) => {
      try {
        return await database.transaction(async (transaction) => {
          const [availablePackage] = await transaction
            .select({ id: packages.id })
            .from(packages)
            .where(
              and(
                eq(packages.id, input.packageId),
                eq(packages.isActive, true),
              ),
            )
            .limit(1);

          if (!availablePackage) {
            throw new AdminClinicCreationError(
              'PACKAGE_NOT_AVAILABLE',
              'The selected package is not available',
            );
          }

          const [duplicateClinic] = await transaction
            .select({ slug: clinics.slug, prefix: clinics.prefix })
            .from(clinics)
            .where(
              or(
                eq(clinics.slug, input.slug),
                eq(clinics.prefix, input.prefix),
              ),
            )
            .limit(1);

          if (duplicateClinic?.slug === input.slug) {
            throw new AdminClinicCreationError(
              'SLUG_TAKEN',
              'That clinic slug is already in use',
            );
          }
          if (duplicateClinic?.prefix === input.prefix) {
            throw new AdminClinicCreationError(
              'PREFIX_TAKEN',
              'That clinic prefix is already in use',
            );
          }

          const [existingOwner] = await transaction
            .select({
              id: users.id,
              deletedAt: users.deletedAt,
              isActive: users.isActive,
            })
            .from(users)
            .where(eq(users.email, input.ownerEmail))
            .limit(1);

          if (
            existingOwner &&
            (existingOwner.deletedAt || existingOwner.isActive !== 'true')
          ) {
            throw new AdminClinicCreationError(
              'OWNER_NOT_AVAILABLE',
              'The owner email belongs to an unavailable account',
            );
          }

          let ownerUserId = existingOwner?.id;
          if (!ownerUserId) {
            const [createdOwner] = await transaction
              .insert(users)
              .values({
                email: input.ownerEmail,
                name: '',
              })
              .returning({ id: users.id });
            ownerUserId = createdOwner.id;
          }

          const [createdClinic] = await transaction
            .insert(clinics)
            .values({
              name: input.name,
              slug: input.slug,
              prefix: input.prefix,
              status: 'trial',
              publicationStatus: 'draft',
            })
            .returning({
              id: clinics.id,
              name: clinics.name,
              slug: clinics.slug,
              prefix: clinics.prefix,
              status: clinics.status,
              createdAt: clinics.createdAt,
            });

          const startsAt = new Date();
          await transaction.insert(clinicMemberships).values({
            userId: ownerUserId,
            clinicId: createdClinic.id,
            role: 'clinic_owner',
            invitedAt: startsAt.toISOString(),
          });

          const [subscription] = await transaction
            .insert(clinicSubscriptions)
            .values({
              clinicId: createdClinic.id,
              packageId: input.packageId,
              status: 'trial',
              startsAt,
              assignedBy: actor.id,
            })
            .returning({ id: clinicSubscriptions.id });

          await transaction.insert(auditEvents).values([
            {
              actorId: actor.id,
              actorEmail: actor.email,
              entityType: 'clinic',
              entityId: createdClinic.id,
              action: AuditAction.CLINIC_CREATED,
              metadata: JSON.stringify({
                ownerUserId,
                packageId: input.packageId,
              }),
            },
            {
              actorId: actor.id,
              actorEmail: actor.email,
              clinicId: createdClinic.id,
              entityType: 'clinic_subscription',
              entityId: subscription.id,
              action: AuditAction.SUBSCRIPTION_ASSIGNED,
              metadata: JSON.stringify({ packageId: input.packageId }),
            },
          ]);

          return {
            ...createdClinic,
            ownerUserId,
            packageId: input.packageId,
          };
        });
      } catch (error) {
        if (error instanceof AdminClinicCreationError) {
          throw error;
        }

        const constraint = getUniqueConstraint(error);
        if (constraint === 'clinics_slug_unique') {
          throw new AdminClinicCreationError(
            'SLUG_TAKEN',
            'That clinic slug is already in use',
          );
        }
        if (constraint === 'clinics_prefix_unique') {
          throw new AdminClinicCreationError(
            'PREFIX_TAKEN',
            'That clinic prefix is already in use',
          );
        }
        if (constraint === 'users_email_unique') {
          throw new AdminClinicCreationError(
            'OWNER_NOT_AVAILABLE',
            'The owner email could not be assigned',
          );
        }

        throw error;
      }
    },
  };
}
