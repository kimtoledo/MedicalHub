import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import {
  branches,
  clinics,
  clinicMemberships,
  dentistBranchAssignments,
  dentists,
  users,
} from '@dentra/db/schema';
import { AuditAction, CapacityMetric } from '@dentra/shared';
import { normalizePrcLicense } from '../dentists/prc-license.js';
import { dentistVerificationNotification, type NotificationService } from '../notifications/service.js';
import { assertClinicCapacity, ClinicCapacityError } from '../entitlements/capacity.js';

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
    public readonly code: 'SLUG_TAKEN' | 'LICENSE_TAKEN',
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

export type AdminDentistDetail = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  licenseNumber: string | null;
  specialty: string | null;
  bio: string | null;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  verificationStatus: DentistVerificationStatus;
  publicationStatus: string;
  createdAt: Date;
  updatedAt: Date;
  affiliations: Array<{
    id: string;
    clinicId: string;
    clinicName: string;
    branchId: string;
    branchName: string;
  }>;
  availableBranches: Array<{
    clinicId: string;
    clinicName: string;
    branchId: string;
    branchName: string;
  }>;
};

export type AdminDentistDetailService = {
  getById: (dentistId: string) => Promise<AdminDentistDetail | null>;
};

export type AdminDentistAffiliationActor = CreateAdminDentistActor;

export type AdminDentistAffiliation = {
  id: string;
  dentistId: string;
  clinicId: string;
  branchId: string;
  isActive: string;
};

export type AdminDentistAffiliationErrorCode =
  | 'DENTIST_NOT_FOUND'
  | 'BRANCH_NOT_AVAILABLE'
  | 'AFFILIATION_EXISTS'
  | 'AFFILIATION_NOT_FOUND'
  | 'DENTIST_LIMIT_REACHED';

export class AdminDentistAffiliationError extends Error {
  constructor(
    public readonly code: AdminDentistAffiliationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminDentistAffiliationError';
  }
}

export type AdminDentistAffiliationService = {
  add: (
    dentistId: string,
    branchId: string,
    actor: AdminDentistAffiliationActor,
  ) => Promise<AdminDentistAffiliation>;
  remove: (
    dentistId: string,
    affiliationId: string,
    actor: AdminDentistAffiliationActor,
  ) => Promise<AdminDentistAffiliation>;
};

export type DentistPublicationStatus = 'draft' | 'published' | 'unpublished';
export type AdminDentistProfileStateErrorCode =
  | 'DENTIST_NOT_FOUND'
  | 'STATE_UNCHANGED'
  | 'VERIFICATION_REQUIRED';

export class AdminDentistProfileStateError extends Error {
  constructor(public readonly code: AdminDentistProfileStateErrorCode, message: string) {
    super(message);
    this.name = 'AdminDentistProfileStateError';
  }
}

export type AdminDentistProfileStateService = {
  updateVerification: (
    dentistId: string,
    status: Extract<DentistVerificationStatus, 'unverified' | 'verified'>,
    reason: string,
    actor: CreateAdminDentistActor,
  ) => Promise<{ id: string; verificationStatus: DentistVerificationStatus }>;
  updatePublication: (
    dentistId: string,
    status: Extract<DentistPublicationStatus, 'published' | 'unpublished'>,
    actor: CreateAdminDentistActor,
  ) => Promise<{ id: string; publicationStatus: string }>;
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

function dentistUniqueConstraint(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const databaseError = error as {
    code?: unknown;
    constraint_name?: unknown;
  };
  return databaseError.code === '23505' && typeof databaseError.constraint_name === 'string'
    ? databaseError.constraint_name
    : null;
}

export function createAdminDentistCreationService(
  database: DB,
): AdminDentistCreationService {
  return {
    create: async (input, actor) => {
      try {
        return await database.transaction(async (transaction) => {
          const licenseNumber = normalizePrcLicense(input.licenseNumber);
          const [duplicateDentist] = await transaction
            .select({ id: dentists.id, slug: dentists.slug, licenseNumber: dentists.licenseNumber })
            .from(dentists)
            .where(or(
              eq(dentists.slug, input.slug),
              licenseNumber ? eq(dentists.licenseNumber, licenseNumber) : undefined,
            ))
            .limit(1);

          if (duplicateDentist) {
            if (licenseNumber && duplicateDentist.licenseNumber === licenseNumber) {
              throw new AdminDentistCreationError(
                'LICENSE_TAKEN',
                'A dentist profile already uses this PRC license number',
              );
            }
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
              licenseNumber,
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

          await writeAudit(transaction, {
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
        const constraint = dentistUniqueConstraint(error);
        if (constraint === 'dentists_slug_unique') {
          throw new AdminDentistCreationError(
            'SLUG_TAKEN',
            'That dentist slug is already in use',
          );
        }
        if (constraint === 'dentists_license_number_unique') {
          throw new AdminDentistCreationError(
            'LICENSE_TAKEN',
            'A dentist profile already uses this PRC license number',
          );
        }
        throw error;
      }
    },
  };
}

export function createAdminDentistDetailService(
  database: DB,
): AdminDentistDetailService {
  return {
    getById: async (dentistId) => {
      const [dentist] = await database
        .select({
          id: dentists.id,
          firstName: dentists.firstName,
          lastName: dentists.lastName,
          slug: dentists.slug,
          licenseNumber: dentists.licenseNumber,
          specialty: dentists.specialty,
          bio: dentists.bio,
          photoUrl: dentists.photoUrl,
          phone: dentists.phone,
          email: dentists.email,
          verificationStatus: dentists.verificationStatus,
          publicationStatus: dentists.publicationStatus,
          createdAt: dentists.createdAt,
          updatedAt: dentists.updatedAt,
        })
        .from(dentists)
        .where(and(eq(dentists.id, dentistId), isNull(dentists.deletedAt)))
        .limit(1);

      if (!dentist) return null;

      const [affiliations, availableBranchRows] = await Promise.all([
        database
        .select({
          id: dentistBranchAssignments.id,
          clinicId: clinics.id,
          clinicName: clinics.name,
          branchId: branches.id,
          branchName: branches.name,
        })
        .from(dentistBranchAssignments)
        .innerJoin(clinics, eq(dentistBranchAssignments.clinicId, clinics.id))
        .innerJoin(branches, eq(dentistBranchAssignments.branchId, branches.id))
        .where(
          and(
            eq(dentistBranchAssignments.dentistId, dentistId),
            eq(dentistBranchAssignments.isActive, 'true'),
            isNull(clinics.deletedAt),
            isNull(branches.deletedAt),
          ),
        )
        .orderBy(clinics.name, branches.name),
        database
          .select({
            clinicId: clinics.id,
            clinicName: clinics.name,
            branchId: branches.id,
            branchName: branches.name,
          })
          .from(branches)
          .innerJoin(clinics, eq(branches.clinicId, clinics.id))
          .where(
            and(
              eq(branches.isActive, true),
              ne(clinics.status, 'archived'),
              isNull(branches.deletedAt),
              isNull(clinics.deletedAt),
            ),
          )
          .orderBy(clinics.name, branches.name),
      ]);

      const assignedBranchIds = new Set(
        affiliations.map((affiliation) => affiliation.branchId),
      );
      const availableBranches = availableBranchRows.filter(
        (branch) => !assignedBranchIds.has(branch.branchId),
      );

      return { ...dentist, affiliations, availableBranches };
    },
  };
}

export function createAdminDentistAffiliationService(
  database: DB,
): AdminDentistAffiliationService {
  return {
    add: async (dentistId, branchId, actor) =>
      database.transaction(async (transaction) => {
        const [dentist] = await transaction
          .select({ id: dentists.id })
          .from(dentists)
          .where(and(eq(dentists.id, dentistId), isNull(dentists.deletedAt)))
          .limit(1);
        if (!dentist) {
          throw new AdminDentistAffiliationError('DENTIST_NOT_FOUND', 'Dentist not found');
        }

        const [branch] = await transaction
          .select({ branchId: branches.id, clinicId: clinics.id })
          .from(branches)
          .innerJoin(clinics, eq(branches.clinicId, clinics.id))
          .where(
            and(
              eq(branches.id, branchId),
              eq(branches.isActive, true),
              ne(clinics.status, 'archived'),
              isNull(branches.deletedAt),
              isNull(clinics.deletedAt),
            ),
          )
          .limit(1);
        if (!branch) {
          throw new AdminDentistAffiliationError(
            'BRANCH_NOT_AVAILABLE',
            'The selected clinic branch is not available',
          );
        }

        // Lock the clinic row so concurrent affiliation requests for this
        // clinic serialize instead of both reading the same dentist count.
        await transaction
          .select({ id: clinics.id })
          .from(clinics)
          .where(eq(clinics.id, branch.clinicId))
          .limit(1)
          .for('update');

        const [existing] = await transaction
          .select({ id: dentistBranchAssignments.id })
          .from(dentistBranchAssignments)
          .where(
            and(
              eq(dentistBranchAssignments.dentistId, dentistId),
              eq(dentistBranchAssignments.branchId, branchId),
              eq(dentistBranchAssignments.isActive, 'true'),
            ),
          )
          .limit(1);
        if (existing) {
          throw new AdminDentistAffiliationError(
            'AFFILIATION_EXISTS',
            'The dentist is already affiliated with that branch',
          );
        }

        // Only consume a capacity seat when this dentist isn't already
        // counted for this clinic — affiliating an already-counted dentist
        // to a second branch of the SAME clinic must never double-count or
        // be blocked by the dentist limit.
        const [alreadyInClinic] = await transaction
          .select({ id: dentistBranchAssignments.id })
          .from(dentistBranchAssignments)
          .where(
            and(
              eq(dentistBranchAssignments.dentistId, dentistId),
              eq(dentistBranchAssignments.clinicId, branch.clinicId),
              eq(dentistBranchAssignments.isActive, 'true'),
            ),
          )
          .limit(1);
        if (!alreadyInClinic) {
          try {
            await assertClinicCapacity(transaction, branch.clinicId, CapacityMetric.DENTISTS);
          } catch (error) {
            if (error instanceof ClinicCapacityError) {
              throw new AdminDentistAffiliationError('DENTIST_LIMIT_REACHED', error.message);
            }
            throw error;
          }
        }

        const [affiliation] = await transaction
          .insert(dentistBranchAssignments)
          .values({ dentistId, branchId, clinicId: branch.clinicId })
          .returning({
            id: dentistBranchAssignments.id,
            dentistId: dentistBranchAssignments.dentistId,
            clinicId: dentistBranchAssignments.clinicId,
            branchId: dentistBranchAssignments.branchId,
            isActive: dentistBranchAssignments.isActive,
          });

        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId: branch.clinicId,
          entityType: 'dentist_branch_assignment',
          entityId: affiliation.id,
          action: AuditAction.DENTIST_AFFILIATED,
          metadata: JSON.stringify({ dentistId, branchId }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
        return affiliation;
      }),

    remove: async (dentistId, affiliationId, actor) =>
      database.transaction(async (transaction) => {
        const [existing] = await transaction
          .select({
            id: dentistBranchAssignments.id,
            dentistId: dentistBranchAssignments.dentistId,
            clinicId: dentistBranchAssignments.clinicId,
            branchId: dentistBranchAssignments.branchId,
          })
          .from(dentistBranchAssignments)
          .where(
            and(
              eq(dentistBranchAssignments.id, affiliationId),
              eq(dentistBranchAssignments.dentistId, dentistId),
              eq(dentistBranchAssignments.isActive, 'true'),
            ),
          )
          .limit(1);
        if (!existing) {
          throw new AdminDentistAffiliationError(
            'AFFILIATION_NOT_FOUND',
            'Active dentist affiliation not found',
          );
        }

        const [affiliation] = await transaction
          .update(dentistBranchAssignments)
          .set({ isActive: 'false' })
          .where(
            and(
              eq(dentistBranchAssignments.id, affiliationId),
              eq(dentistBranchAssignments.dentistId, dentistId),
              eq(dentistBranchAssignments.isActive, 'true'),
            ),
          )
          .returning({
            id: dentistBranchAssignments.id,
            dentistId: dentistBranchAssignments.dentistId,
            clinicId: dentistBranchAssignments.clinicId,
            branchId: dentistBranchAssignments.branchId,
            isActive: dentistBranchAssignments.isActive,
          });
        if (!affiliation) {
          throw new AdminDentistAffiliationError(
            'AFFILIATION_NOT_FOUND',
            'The affiliation changed before this request completed',
          );
        }

        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId: existing.clinicId,
          entityType: 'dentist_branch_assignment',
          entityId: existing.id,
          action: AuditAction.DENTIST_UNAFFILIATED,
          metadata: JSON.stringify({ dentistId, branchId: existing.branchId }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
        return affiliation;
      }),
  };
}

export function createAdminDentistProfileStateService(
  database: DB,
  notifications?: NotificationService,
): AdminDentistProfileStateService {
  return {
    updateVerification: async (dentistId, status, reason, actor) =>
      database.transaction(async (transaction) => {
        const [current] = await transaction.select({ status: dentists.verificationStatus, firstName: dentists.firstName, lastName: dentists.lastName, email: dentists.email })
          .from(dentists).where(and(eq(dentists.id, dentistId), isNull(dentists.deletedAt))).limit(1);
        if (!current) throw new AdminDentistProfileStateError('DENTIST_NOT_FOUND', 'Dentist not found');
        if (current.status === status) throw new AdminDentistProfileStateError('STATE_UNCHANGED', `Dentist is already ${status}`);
        const [updated] = await transaction.update(dentists).set({ verificationStatus: status })
          .where(and(eq(dentists.id, dentistId), eq(dentists.verificationStatus, current.status), isNull(dentists.deletedAt)))
          .returning({ id: dentists.id, verificationStatus: dentists.verificationStatus });
        if (!updated) throw new AdminDentistProfileStateError('STATE_UNCHANGED', 'Dentist verification changed before this request completed');
        await writeAudit(transaction, {
          actorId: actor.id, actorEmail: actor.email, entityType: 'dentist', entityId: dentistId,
          action: status === 'verified' ? AuditAction.DENTIST_VERIFIED : AuditAction.DENTIST_VERIFICATION_REVOKED,
          metadata: JSON.stringify({ previousStatus: current.status, nextStatus: status, reason }),
          ipAddress: actor.ipAddress, userAgent: actor.userAgent,
        });
        if (notifications) {
          let recipient = current.email;
          if (!recipient) {
            const [linkedUser] = await transaction.select({ email: users.email })
              .from(clinicMemberships)
              .innerJoin(users, eq(users.id, clinicMemberships.userId))
              .where(and(eq(clinicMemberships.dentistId, dentistId), eq(clinicMemberships.isActive, 'true')))
              .limit(1);
            recipient = linkedUser?.email ?? null;
          }
          if (recipient) {
            await notifications.enqueue(transaction as unknown as DB, dentistVerificationNotification({
              dentistName: `${current.firstName} ${current.lastName}`,
              recipient,
              status: status === 'verified' ? 'approved' : 'revoked',
              reason,
              dedupeKey: `dentist-verification-manual:${dentistId}:${status}:${updated.id}:${Date.now()}`,
            }));
          }
        }
        return updated;
      }),
    updatePublication: async (dentistId, status, actor) =>
      database.transaction(async (transaction) => {
        const [current] = await transaction.select({
          publicationStatus: dentists.publicationStatus,
          verificationStatus: dentists.verificationStatus,
        }).from(dentists).where(and(eq(dentists.id, dentistId), isNull(dentists.deletedAt))).limit(1);
        if (!current) throw new AdminDentistProfileStateError('DENTIST_NOT_FOUND', 'Dentist not found');
        if (current.publicationStatus === status) throw new AdminDentistProfileStateError('STATE_UNCHANGED', `Dentist profile is already ${status}`);
        if (status === 'published' && current.verificationStatus !== 'verified') {
          throw new AdminDentistProfileStateError('VERIFICATION_REQUIRED', 'Verify the dentist before publishing the public profile');
        }
        const [updated] = await transaction.update(dentists).set({ publicationStatus: status })
          .where(and(eq(dentists.id, dentistId), eq(dentists.publicationStatus, current.publicationStatus), isNull(dentists.deletedAt)))
          .returning({ id: dentists.id, publicationStatus: dentists.publicationStatus });
        if (!updated) throw new AdminDentistProfileStateError('STATE_UNCHANGED', 'Dentist publication changed before this request completed');
        await writeAudit(transaction, {
          actorId: actor.id, actorEmail: actor.email, entityType: 'dentist', entityId: dentistId,
          action: status === 'published' ? AuditAction.DENTIST_PUBLISHED : AuditAction.DENTIST_UNPUBLISHED,
          metadata: JSON.stringify({ previousStatus: current.publicationStatus, nextStatus: status }),
          ipAddress: actor.ipAddress, userAgent: actor.userAgent,
        });
        return updated;
      }),
  };
}
