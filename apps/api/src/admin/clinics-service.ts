import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  or,
} from 'drizzle-orm';
import type { DB } from '@dentra/db';
import {
  auditEvents,
  branches,
  clinicFeatureOverrides,
  clinicMemberships,
  clinics,
  clinicSubscriptions,
  packageFeatures,
  packages,
  users,
} from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';
import type { FeatureKey } from '@dentra/shared';

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

export type AdminClinicDetail = {
  id: string;
  name: string;
  slug: string;
  prefix: string;
  status: ClinicStatus;
  publicationStatus: typeof clinics.$inferSelect.publicationStatus;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string;
    email: string;
    invitedAt: string | null;
    joinedAt: string | null;
  } | null;
  branches: Array<{
    id: string;
    name: string;
    isMain: boolean;
    isActive: boolean;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
  }>;
  subscription: {
    id: string;
    status: typeof clinicSubscriptions.$inferSelect.status;
    startsAt: Date;
    expiresAt: Date | null;
    package: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
    };
  } | null;
  featureOverrides: Array<{
    id: string;
    featureKey: FeatureKey | string;
    isEnabled: boolean;
    reason: string;
    expiresAt: Date | null;
    createdAt: Date;
  }>;
  effectiveEntitlements: Array<{
    featureKey: FeatureKey | string;
    isEnabled: boolean;
    source: 'package' | 'override';
    reason: string | null;
    expiresAt: Date | null;
  }>;
};

export type AdminClinicDetailService = {
  getById: (clinicId: string) => Promise<AdminClinicDetail | null>;
};

export type UpdateAdminClinicStatusActor = {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

export type UpdatedAdminClinicStatus = {
  id: string;
  status: ClinicStatus;
  updatedAt: Date;
};

export type AdminClinicStatusErrorCode =
  | 'CLINIC_NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION';

export class AdminClinicStatusError extends Error {
  constructor(
    public readonly code: AdminClinicStatusErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminClinicStatusError';
  }
}

export type AdminClinicStatusService = {
  updateStatus: (
    clinicId: string,
    status: Exclude<ClinicStatus, 'trial'>,
    actor: UpdateAdminClinicStatusActor,
  ) => Promise<UpdatedAdminClinicStatus>;
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

export function createAdminClinicDetailService(
  database: DB,
): AdminClinicDetailService {
  return {
    getById: async (clinicId) => {
      const [clinic] = await database
        .select({
          id: clinics.id,
          name: clinics.name,
          slug: clinics.slug,
          prefix: clinics.prefix,
          status: clinics.status,
          publicationStatus: clinics.publicationStatus,
          email: clinics.email,
          phone: clinics.phone,
          website: clinics.website,
          description: clinics.description,
          address: clinics.address,
          city: clinics.city,
          province: clinics.province,
          createdAt: clinics.createdAt,
          updatedAt: clinics.updatedAt,
        })
        .from(clinics)
        .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
        .limit(1);

      if (!clinic) {
        return null;
      }

      const now = new Date();
      const [ownerRows, branchRows, subscriptionRows, overrideRows] =
        await Promise.all([
          database
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              invitedAt: clinicMemberships.invitedAt,
              joinedAt: clinicMemberships.joinedAt,
            })
            .from(clinicMemberships)
            .innerJoin(users, eq(clinicMemberships.userId, users.id))
            .where(
              and(
                eq(clinicMemberships.clinicId, clinicId),
                eq(clinicMemberships.role, 'clinic_owner'),
                eq(clinicMemberships.isActive, 'true'),
                isNull(users.deletedAt),
              ),
            )
            .orderBy(clinicMemberships.createdAt)
            .limit(1),
          database
            .select({
              id: branches.id,
              name: branches.name,
              isMain: branches.isMain,
              isActive: branches.isActive,
              phone: branches.phone,
              email: branches.email,
              address: branches.address,
              city: branches.city,
              province: branches.province,
            })
            .from(branches)
            .where(
              and(
                eq(branches.clinicId, clinicId),
                isNull(branches.deletedAt),
              ),
            )
            .orderBy(desc(branches.isMain), branches.name),
          database
            .select({
              id: clinicSubscriptions.id,
              status: clinicSubscriptions.status,
              startsAt: clinicSubscriptions.startsAt,
              expiresAt: clinicSubscriptions.expiresAt,
              packageId: packages.id,
              packageName: packages.name,
              packageSlug: packages.slug,
              packageDescription: packages.description,
            })
            .from(clinicSubscriptions)
            .innerJoin(packages, eq(clinicSubscriptions.packageId, packages.id))
            .where(eq(clinicSubscriptions.clinicId, clinicId))
            .orderBy(desc(clinicSubscriptions.startsAt))
            .limit(1),
          database
            .select({
              id: clinicFeatureOverrides.id,
              featureKey: clinicFeatureOverrides.featureKey,
              isEnabled: clinicFeatureOverrides.isEnabled,
              reason: clinicFeatureOverrides.reason,
              expiresAt: clinicFeatureOverrides.expiresAt,
              createdAt: clinicFeatureOverrides.createdAt,
            })
            .from(clinicFeatureOverrides)
            .where(
              and(
                eq(clinicFeatureOverrides.clinicId, clinicId),
                or(
                  isNull(clinicFeatureOverrides.expiresAt),
                  gt(clinicFeatureOverrides.expiresAt, now),
                ),
              ),
            )
            .orderBy(desc(clinicFeatureOverrides.createdAt)),
        ]);

      const subscriptionRow = subscriptionRows[0];
      const packageFeatureRows = subscriptionRow
        ? await database
            .select({
              featureKey: packageFeatures.featureKey,
              isEnabled: packageFeatures.isEnabled,
            })
            .from(packageFeatures)
            .where(eq(packageFeatures.packageId, subscriptionRow.packageId))
        : [];

      const latestOverrides = new Map<
        string,
        (typeof overrideRows)[number]
      >();
      overrideRows.forEach((override) => {
        if (!latestOverrides.has(override.featureKey)) {
          latestOverrides.set(override.featureKey, override);
        }
      });

      const packageEntitlements = new Map(
        packageFeatureRows.map((feature) => [feature.featureKey, feature.isEnabled]),
      );
      const featureKeys = new Set([
        ...packageEntitlements.keys(),
        ...latestOverrides.keys(),
      ]);
      const effectiveEntitlements = [...featureKeys]
        .sort()
        .map((featureKey) => {
          const override = latestOverrides.get(featureKey);
          if (override) {
            return {
              featureKey,
              isEnabled: override.isEnabled,
              source: 'override' as const,
              reason: override.reason,
              expiresAt: override.expiresAt,
            };
          }

          return {
            featureKey,
            isEnabled: packageEntitlements.get(featureKey) ?? false,
            source: 'package' as const,
            reason: null,
            expiresAt: null,
          };
        });

      return {
        ...clinic,
        owner: ownerRows[0] ?? null,
        branches: branchRows,
        subscription: subscriptionRow
          ? {
              id: subscriptionRow.id,
              status: subscriptionRow.status,
              startsAt: subscriptionRow.startsAt,
              expiresAt: subscriptionRow.expiresAt,
              package: {
                id: subscriptionRow.packageId,
                name: subscriptionRow.packageName,
                slug: subscriptionRow.packageSlug,
                description: subscriptionRow.packageDescription,
              },
            }
          : null,
        featureOverrides: [...latestOverrides.values()],
        effectiveEntitlements,
      };
    },
  };
}

const allowedClinicStatusTransitions: Record<
  ClinicStatus,
  Array<Exclude<ClinicStatus, 'trial'>>
> = {
  trial: ['active', 'suspended', 'archived'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: ['active'],
};

function getClinicStatusAuditAction(
  previousStatus: ClinicStatus,
  nextStatus: Exclude<ClinicStatus, 'trial'>,
): (typeof AuditAction)[keyof typeof AuditAction] {
  if (nextStatus === 'suspended') return AuditAction.CLINIC_SUSPENDED;
  if (nextStatus === 'archived') return AuditAction.CLINIC_ARCHIVED;
  return previousStatus === 'trial'
    ? AuditAction.CLINIC_ACTIVATED
    : AuditAction.CLINIC_REACTIVATED;
}

export function createAdminClinicStatusService(
  database: DB,
): AdminClinicStatusService {
  return {
    updateStatus: async (clinicId, status, actor) =>
      database.transaction(async (transaction) => {
        const [clinic] = await transaction
          .select({ status: clinics.status })
          .from(clinics)
          .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
          .limit(1);

        if (!clinic) {
          throw new AdminClinicStatusError(
            'CLINIC_NOT_FOUND',
            'Clinic not found',
          );
        }

        if (!allowedClinicStatusTransitions[clinic.status].includes(status)) {
          throw new AdminClinicStatusError(
            'INVALID_STATUS_TRANSITION',
            `A ${clinic.status} clinic cannot transition to ${status}`,
          );
        }

        const [updatedClinic] = await transaction
          .update(clinics)
          .set({ status })
          .where(
            and(
              eq(clinics.id, clinicId),
              eq(clinics.status, clinic.status),
              isNull(clinics.deletedAt),
            ),
          )
          .returning({
            id: clinics.id,
            status: clinics.status,
            updatedAt: clinics.updatedAt,
          });

        if (!updatedClinic) {
          throw new AdminClinicStatusError(
            'INVALID_STATUS_TRANSITION',
            'The clinic status changed before this request completed',
          );
        }

        await transaction.insert(auditEvents).values({
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId,
          entityType: 'clinic',
          entityId: clinicId,
          action: getClinicStatusAuditAction(clinic.status, status),
          metadata: JSON.stringify({
            previousStatus: clinic.status,
            nextStatus: status,
          }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });

        return updatedClinic;
      }),
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
