import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lte,
  or,
} from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import {
  branches,
  clinicFeatureOverrides,
  clinicLimitOverrides,
  clinicMemberships,
  clinics,
  clinicSubscriptions,
  dentistBranchAssignments,
  dentists,
  packageFeatures,
  packages,
  patients,
  users,
} from '@dentra/db/schema';
import { AuditAction, CapacityMetric, FeatureKey } from '@dentra/shared';
import { assertClinicCapacity, ClinicCapacityError, getClinicCapacitySummary } from '../entitlements/capacity.js';

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
  logoUrl: string | null;
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
  availableFeatureKeys: FeatureKey[];
  limitOverrides: Array<{
    id: string;
    metric: CapacityMetric | string;
    limit: number | null;
    reason: string;
    expiresAt: Date | null;
    createdAt: Date;
  }>;
  capacity: Array<{ metric: CapacityMetric | string; limit: number | null; used: number }>;
  availableCapacityMetrics: CapacityMetric[];
  dentistCount: number;
  staffCount: number;
  patientCount: number;
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

export type CreateAdminClinicBranchInput = {
  name: string;
  isMain: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
};

export type CreateAdminClinicBranchActor = {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

export type CreatedAdminClinicBranch = {
  id: string;
  clinicId: string;
  name: string;
  isMain: boolean;
  isActive: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  createdAt: Date;
};

export type AdminClinicBranchCreationErrorCode =
  | 'CLINIC_NOT_FOUND'
  | 'MAIN_BRANCH_EXISTS'
  | 'BRANCH_LIMIT_REACHED';

export class AdminClinicBranchCreationError extends Error {
  constructor(
    public readonly code: AdminClinicBranchCreationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminClinicBranchCreationError';
  }
}

export type AdminClinicBranchCreationService = {
  create: (
    clinicId: string,
    input: CreateAdminClinicBranchInput,
    actor: CreateAdminClinicBranchActor,
  ) => Promise<CreatedAdminClinicBranch>;
};

export function createAdminClinicListService(
  database: DB,
): AdminClinicListService {
  return {
    list: async (input) => {
      const now = new Date();
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
          .where(
            and(
              inArray(clinicSubscriptions.clinicId, clinicIds),
              lte(clinicSubscriptions.startsAt, now),
              or(
                isNull(clinicSubscriptions.expiresAt),
                gt(clinicSubscriptions.expiresAt, now),
              ),
            ),
          )
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
          logoUrl: clinics.logoUrl,
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
      const [ownerRows, branchRows, subscriptionRows, overrideRows, limitOverrideRows, capacitySummary, dentistCountRows, staffCountRows, patientCountRows] =
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
            .where(
              and(
                eq(clinicSubscriptions.clinicId, clinicId),
                lte(clinicSubscriptions.startsAt, now),
                or(
                  isNull(clinicSubscriptions.expiresAt),
                  gt(clinicSubscriptions.expiresAt, now),
                ),
              ),
            )
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
          database
            .select({
              id: clinicLimitOverrides.id,
              metric: clinicLimitOverrides.metric,
              limit: clinicLimitOverrides.limit,
              reason: clinicLimitOverrides.reason,
              expiresAt: clinicLimitOverrides.expiresAt,
              createdAt: clinicLimitOverrides.createdAt,
            })
            .from(clinicLimitOverrides)
            .where(
              and(
                eq(clinicLimitOverrides.clinicId, clinicId),
                or(
                  isNull(clinicLimitOverrides.expiresAt),
                  gt(clinicLimitOverrides.expiresAt, now),
                ),
              ),
            )
            .orderBy(desc(clinicLimitOverrides.createdAt)),
          getClinicCapacitySummary(database, clinicId),
          database
            .select({ count: countDistinct(dentistBranchAssignments.dentistId) })
            .from(dentistBranchAssignments)
            .where(
              and(
                eq(dentistBranchAssignments.clinicId, clinicId),
                eq(dentistBranchAssignments.isActive, 'true'),
              ),
            ),
          database
            .select({ count: count(clinicMemberships.id) })
            .from(clinicMemberships)
            .where(
              and(
                eq(clinicMemberships.clinicId, clinicId),
                eq(clinicMemberships.isActive, 'true'),
              ),
            ),
          database
            .select({ count: count(patients.id) })
            .from(patients)
            .where(and(eq(patients.clinicId, clinicId), isNull(patients.deletedAt))),
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

      const latestLimitOverrides = new Map<
        string,
        (typeof limitOverrideRows)[number]
      >();
      limitOverrideRows.forEach((override) => {
        if (!latestLimitOverrides.has(override.metric)) {
          latestLimitOverrides.set(override.metric, override);
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
        availableFeatureKeys: Object.values(FeatureKey),
        limitOverrides: [...latestLimitOverrides.values()],
        capacity: capacitySummary,
        availableCapacityMetrics: Object.values(CapacityMetric),
        dentistCount: dentistCountRows[0]?.count ?? 0,
        staffCount: staffCountRows[0]?.count ?? 0,
        patientCount: patientCountRows[0]?.count ?? 0,
      };
    },
  };
}

// A safety cap for the Dentists/Users list tabs — these are expected to be
// small per clinic (unlike Patients, which is properly paginated).
const RELATED_LIST_LIMIT = 200;

export type AdminClinicDentistListItem = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  verificationStatus: typeof dentists.$inferSelect.verificationStatus;
  publicationStatus: typeof dentists.$inferSelect.publicationStatus;
  branchNames: string[];
};

export type AdminClinicDentistsListService = {
  listDentists: (clinicId: string) => Promise<AdminClinicDentistListItem[]>;
};

export function createAdminClinicDentistsListService(
  database: DB,
): AdminClinicDentistsListService {
  return {
    listDentists: async (clinicId) => {
      const rows = await database
        .select({
          id: dentists.id,
          firstName: dentists.firstName,
          lastName: dentists.lastName,
          slug: dentists.slug,
          verificationStatus: dentists.verificationStatus,
          publicationStatus: dentists.publicationStatus,
          branchName: branches.name,
        })
        .from(dentistBranchAssignments)
        .innerJoin(dentists, eq(dentistBranchAssignments.dentistId, dentists.id))
        .innerJoin(branches, eq(dentistBranchAssignments.branchId, branches.id))
        .where(
          and(
            eq(dentistBranchAssignments.clinicId, clinicId),
            eq(dentistBranchAssignments.isActive, 'true'),
            isNull(dentists.deletedAt),
          ),
        )
        .orderBy(dentists.lastName, dentists.firstName)
        .limit(RELATED_LIST_LIMIT);

      const byDentist = new Map<string, AdminClinicDentistListItem>();
      for (const row of rows) {
        const existing = byDentist.get(row.id);
        if (existing) {
          if (!existing.branchNames.includes(row.branchName)) existing.branchNames.push(row.branchName);
          continue;
        }
        byDentist.set(row.id, {
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          slug: row.slug,
          verificationStatus: row.verificationStatus,
          publicationStatus: row.publicationStatus,
          branchNames: [row.branchName],
        });
      }
      return [...byDentist.values()];
    },
  };
}

export type AdminClinicPatientListItem = {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
};

export type ListAdminClinicPatientsInput = {
  page: number;
  pageSize: number;
  search?: string;
};

export type AdminClinicPatientsListResult = {
  items: AdminClinicPatientListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AdminClinicPatientsListService = {
  listPatients: (
    clinicId: string,
    input: ListAdminClinicPatientsInput,
  ) => Promise<AdminClinicPatientsListResult>;
};

export function createAdminClinicPatientsListService(
  database: DB,
): AdminClinicPatientsListService {
  return {
    listPatients: async (clinicId, input) => {
      const search = input.search?.trim();
      const where = and(
        eq(patients.clinicId, clinicId),
        isNull(patients.deletedAt),
        search
          ? or(
              ilike(patients.firstName, `%${search}%`),
              ilike(patients.lastName, `%${search}%`),
              ilike(patients.patientNumber, `%${search}%`),
            )
          : undefined,
      );

      const [totalRow] = await database
        .select({ total: count(patients.id) })
        .from(patients)
        .where(where);
      const total = totalRow?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
      const page = Math.min(input.page, totalPages);

      const items = await database
        .select({
          id: patients.id,
          patientNumber: patients.patientNumber,
          firstName: patients.firstName,
          lastName: patients.lastName,
          phone: patients.phone,
          email: patients.email,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .where(where)
        .orderBy(desc(patients.createdAt))
        .limit(input.pageSize)
        .offset((page - 1) * input.pageSize);

      return {
        items,
        pagination: { page, pageSize: input.pageSize, total, totalPages },
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
          .set({ status, archivedAt: status === 'archived' ? new Date() : null })
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

        await writeAudit(transaction, {
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

export type UpdateAdminClinicAccountInfoInput = {
  name?: string;
  slug?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  website?: string | null;
  description?: string | null;
  logoUrl?: string | null;
};

export type UpdateAdminClinicAccountInfoActor = {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

export type UpdatedAdminClinicAccountInfo = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  updatedAt: Date;
};

export type AdminClinicAccountUpdateErrorCode =
  | 'CLINIC_NOT_FOUND'
  | 'SLUG_TAKEN'
  | 'SLUG_LOCKED';

export class AdminClinicAccountUpdateError extends Error {
  constructor(
    public readonly code: AdminClinicAccountUpdateErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminClinicAccountUpdateError';
  }
}

export type AdminClinicAccountUpdateService = {
  update: (
    clinicId: string,
    input: UpdateAdminClinicAccountInfoInput,
    actor: UpdateAdminClinicAccountInfoActor,
  ) => Promise<UpdatedAdminClinicAccountInfo>;
};

const accountInfoFields = [
  'name',
  'slug',
  'email',
  'phone',
  'address',
  'city',
  'province',
  'website',
  'description',
  'logoUrl',
] as const satisfies readonly (keyof UpdateAdminClinicAccountInfoInput)[];

export function createAdminClinicAccountUpdateService(
  database: DB,
): AdminClinicAccountUpdateService {
  return {
    update: async (clinicId, input, actor) => {
      try {
        return await database.transaction(async (transaction) => {
          const [clinic] = await transaction
            .select({
              name: clinics.name,
              slug: clinics.slug,
              email: clinics.email,
              phone: clinics.phone,
              address: clinics.address,
              city: clinics.city,
              province: clinics.province,
              website: clinics.website,
              description: clinics.description,
              logoUrl: clinics.logoUrl,
              publicationStatus: clinics.publicationStatus,
            })
            .from(clinics)
            .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
            .limit(1);

          if (!clinic) {
            throw new AdminClinicAccountUpdateError(
              'CLINIC_NOT_FOUND',
              'Clinic not found',
            );
          }

          const slugChanged =
            input.slug !== undefined && input.slug !== clinic.slug;

          if (slugChanged && clinic.publicationStatus !== 'draft') {
            throw new AdminClinicAccountUpdateError(
              'SLUG_LOCKED',
              'The clinic slug cannot change once the microsite has been published',
            );
          }

          if (slugChanged) {
            const [duplicateClinic] = await transaction
              .select({ id: clinics.id })
              .from(clinics)
              .where(and(eq(clinics.slug, input.slug!), isNull(clinics.deletedAt)))
              .limit(1);

            if (duplicateClinic) {
              throw new AdminClinicAccountUpdateError(
                'SLUG_TAKEN',
                'That clinic slug is already in use',
              );
            }
          }

          const changedFields = accountInfoFields.filter(
            (field) => input[field] !== undefined && input[field] !== clinic[field],
          );

          const updateValues = Object.fromEntries(
            changedFields.map((field) => [field, input[field]]),
          );

          const [updatedClinic] = await transaction
            .update(clinics)
            .set(updateValues)
            .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
            .returning({
              id: clinics.id,
              name: clinics.name,
              slug: clinics.slug,
              email: clinics.email,
              phone: clinics.phone,
              address: clinics.address,
              city: clinics.city,
              province: clinics.province,
              website: clinics.website,
              description: clinics.description,
              logoUrl: clinics.logoUrl,
              updatedAt: clinics.updatedAt,
            });

          if (changedFields.length > 0) {
            await writeAudit(transaction, {
              actorId: actor.id,
              actorEmail: actor.email,
              clinicId,
              entityType: 'clinic',
              entityId: clinicId,
              action: AuditAction.CLINIC_UPDATED,
              metadata: JSON.stringify({
                changedFields,
                previous: Object.fromEntries(
                  changedFields.map((field) => [field, clinic[field]]),
                ),
                next: updateValues,
              }),
              ipAddress: actor.ipAddress,
              userAgent: actor.userAgent,
            });
          }

          return updatedClinic;
        });
      } catch (error) {
        if (error instanceof AdminClinicAccountUpdateError) {
          throw error;
        }

        const constraint = getUniqueConstraint(error);
        if (constraint === 'clinics_slug_unique') {
          throw new AdminClinicAccountUpdateError(
            'SLUG_TAKEN',
            'That clinic slug is already in use',
          );
        }

        throw error;
      }
    },
  };
}

export function createAdminClinicBranchCreationService(
  database: DB,
): AdminClinicBranchCreationService {
  return {
    create: async (clinicId, input, actor) =>
      database.transaction(async (transaction) => {
        const [clinic] = await transaction
          .select({ id: clinics.id })
          .from(clinics)
          .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
          .limit(1)
          .for('update');

        if (!clinic) {
          throw new AdminClinicBranchCreationError(
            'CLINIC_NOT_FOUND',
            'Clinic not found',
          );
        }

        try {
          await assertClinicCapacity(transaction, clinicId, CapacityMetric.BRANCHES);
        } catch (error) {
          if (error instanceof ClinicCapacityError) {
            throw new AdminClinicBranchCreationError('BRANCH_LIMIT_REACHED', error.message);
          }
          throw error;
        }

        const existingBranches = await transaction
          .select({ isMain: branches.isMain })
          .from(branches)
          .where(
            and(
              eq(branches.clinicId, clinicId),
              eq(branches.isActive, true),
              isNull(branches.deletedAt),
            ),
          );
        const isFirstBranch = existingBranches.length === 0;
        const isMain = isFirstBranch || input.isMain;

        if (isMain && existingBranches.some((branch) => branch.isMain)) {
          throw new AdminClinicBranchCreationError(
            'MAIN_BRANCH_EXISTS',
            'This clinic already has an active main branch',
          );
        }

        const [createdBranch] = await transaction
          .insert(branches)
          .values({
            clinicId,
            name: input.name,
            isMain,
            phone: input.phone,
            email: input.email,
            address: input.address,
            city: input.city,
            province: input.province,
          })
          .returning({
            id: branches.id,
            clinicId: branches.clinicId,
            name: branches.name,
            isMain: branches.isMain,
            isActive: branches.isActive,
            phone: branches.phone,
            email: branches.email,
            address: branches.address,
            city: branches.city,
            province: branches.province,
            createdAt: branches.createdAt,
          });

        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId,
          entityType: 'branch',
          entityId: createdBranch.id,
          action: AuditAction.BRANCH_CREATED,
          metadata: JSON.stringify({ isMain: createdBranch.isMain }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });

        return createdBranch;
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

          await writeAudit(transaction, [
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
