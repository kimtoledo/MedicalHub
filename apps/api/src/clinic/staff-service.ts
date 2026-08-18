import { and, asc, count, eq, isNull, ne } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import {
  branches,
  accounts,
  clinicMembershipPermissions,
  clinicMemberships,
  dentistBranchAssignments,
  dentists,
  users,
} from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import {
  AuditAction,
  PermissionKey,
  type ClinicRole,
} from '@dentra/shared';
import { permissionPresets } from './permissions.js';

export { permissionPresets } from './permissions.js';

export type StaffActor = {
  id: string;
  email: string;
  role: 'clinic_owner' | 'clinic_admin';
  ipAddress?: string;
  userAgent?: string;
};

export type StaffMutation = {
  role?: ClinicRole;
  branchId?: string | null;
  dentistId?: string | null;
  isActive?: boolean;
};

export class ClinicStaffError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

async function assertBranch(database: DB, clinicId: string, branchId: string | null): Promise<void> {
  if (!branchId) return;
  const [branch] = await database
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, branchId), eq(branches.clinicId, clinicId)))
    .limit(1);
  if (!branch) throw new ClinicStaffError('BRANCH_NOT_FOUND', 'Branch not found in this clinic', 404);
}

async function assertDentistLink(database: DB, clinicId: string, dentistId: string | null, branchId: string | null): Promise<void> {
  if (!dentistId) throw new ClinicStaffError('DENTIST_PROFILE_REQUIRED', 'Select the PRC-identified dentist profile for this login', 422);
  const [profile] = await database
    .select({ id: dentists.id, licenseNumber: dentists.licenseNumber })
    .from(dentistBranchAssignments)
    .innerJoin(dentists, eq(dentists.id, dentistBranchAssignments.dentistId))
    .where(and(
      eq(dentistBranchAssignments.clinicId, clinicId),
      eq(dentistBranchAssignments.dentistId, dentistId),
      branchId ? eq(dentistBranchAssignments.branchId, branchId) : undefined,
      eq(dentistBranchAssignments.isActive, 'true'),
      isNull(dentists.deletedAt),
    ))
    .limit(1);
  if (!profile) throw new ClinicStaffError('DENTIST_NOT_AFFILIATED', 'The selected dentist profile is not affiliated with this clinic or branch', 422);
  if (!profile.licenseNumber) throw new ClinicStaffError('PRC_LICENSE_REQUIRED', 'Add the dentist PRC license number before linking clinic access', 422);
}

async function assertOwnerRemains(database: DB, clinicId: string, excludedMembershipId: string): Promise<void> {
  const [owners] = await database
    .select({ value: count() })
    .from(clinicMemberships)
    .where(and(
      eq(clinicMemberships.clinicId, clinicId),
      eq(clinicMemberships.role, 'clinic_owner'),
      eq(clinicMemberships.isActive, 'true'),
      ne(clinicMemberships.id, excludedMembershipId),
    ));
  if (!owners || owners.value < 1) {
    throw new ClinicStaffError('LAST_OWNER_REQUIRED', 'The clinic must retain at least one active owner', 409);
  }
}

async function audit(
  database: DB,
  actor: StaffActor,
  clinicId: string,
  membershipId: string,
  action: (typeof AuditAction)[keyof typeof AuditAction],
  metadata: Record<string, unknown>,
): Promise<void> {
  await writeAudit(database, {
    actorId: actor.id,
    actorEmail: actor.email,
    clinicId,
    entityType: 'clinic_membership',
    entityId: membershipId,
    action,
    metadata: JSON.stringify(metadata),
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

export type ClinicStaffService = ReturnType<typeof createClinicStaffService>;

export function createClinicStaffService(database: DB) {
  return {
    list: async (clinicId: string) => {
      const [branchRows, rows, dentistRows] = await Promise.all([
        database.select({ id: branches.id, name: branches.name, isMain: branches.isMain })
          .from(branches)
          .where(eq(branches.clinicId, clinicId))
          .orderBy(asc(branches.name)),
        database.select({
          membershipId: clinicMemberships.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          role: clinicMemberships.role,
          dentistId: clinicMemberships.dentistId,
          branchId: clinicMemberships.branchId,
          isActive: clinicMemberships.isActive,
          invitedAt: clinicMemberships.invitedAt,
          joinedAt: clinicMemberships.joinedAt,
          permissionKey: clinicMembershipPermissions.permissionKey,
          permissionEnabled: clinicMembershipPermissions.isEnabled,
        })
          .from(clinicMemberships)
          .innerJoin(users, eq(clinicMemberships.userId, users.id))
          .leftJoin(clinicMembershipPermissions, eq(clinicMemberships.id, clinicMembershipPermissions.membershipId))
          .where(eq(clinicMemberships.clinicId, clinicId))
          .orderBy(asc(users.name)),
        database.select({
          id: dentists.id,
          firstName: dentists.firstName,
          lastName: dentists.lastName,
          licenseNumber: dentists.licenseNumber,
          verificationStatus: dentists.verificationStatus,
        })
          .from(dentistBranchAssignments)
          .innerJoin(dentists, eq(dentists.id, dentistBranchAssignments.dentistId))
          .where(and(
            eq(dentistBranchAssignments.clinicId, clinicId),
            eq(dentistBranchAssignments.isActive, 'true'),
            isNull(dentists.deletedAt),
          ))
          .orderBy(asc(dentists.lastName), asc(dentists.firstName)),
      ]);

      const grouped = new Map<string, {
        membershipId: string;
        userId: string;
        name: string;
        email: string;
        role: ClinicRole;
        dentistId: string | null;
        branchId: string | null;
        isActive: boolean;
        invitedAt: string | null;
        joinedAt: string | null;
        permissions: Set<string>;
      }>();

      for (const row of rows) {
        const current = grouped.get(row.membershipId) ?? {
          membershipId: row.membershipId,
          userId: row.userId,
          name: row.name,
          email: row.email,
          role: row.role,
          dentistId: row.dentistId,
          branchId: row.branchId,
          isActive: row.isActive === 'true',
          invitedAt: row.invitedAt,
          joinedAt: row.joinedAt,
          permissions: new Set(permissionPresets[row.role]),
        };
        if (row.permissionKey) {
          if (row.permissionEnabled) current.permissions.add(row.permissionKey);
          else current.permissions.delete(row.permissionKey);
        }
        grouped.set(row.membershipId, current);
      }

      return {
        branches: branchRows,
        dentists: [...new Map(dentistRows.map((dentist) => [dentist.id, dentist])).values()],
        permissionKeys: Object.values(PermissionKey),
        members: [...grouped.values()].map((member) => ({
          ...member,
          status: !member.isActive ? 'inactive' as const : member.joinedAt ? 'active' as const : 'pending' as const,
          permissions: [...member.permissions],
        })),
      };
    },

    invite: async (
      clinicId: string,
      input: { name: string; email: string; role: ClinicRole; branchId: string | null; dentistId?: string | null },
      actor: StaffActor,
    ) => {
      if (input.role === 'clinic_owner' && actor.role !== 'clinic_owner') {
        throw new ClinicStaffError('OWNER_REQUIRED', 'Only a clinic owner can invite another owner', 403);
      }
      await assertBranch(database, clinicId, input.branchId);
      if (input.role === 'dentist') await assertDentistLink(database, clinicId, input.dentistId ?? null, input.branchId);
      else if (input.dentistId) throw new ClinicStaffError('DENTIST_ROLE_REQUIRED', 'A dentist profile can only be linked to the Dentist role', 422);
      const email = input.email.trim().toLowerCase();
      const now = new Date().toISOString();

      return database.transaction(async (tx) => {
        let [user] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        if (!user) {
          [user] = await tx.insert(users).values({ name: input.name.trim(), email, isActive: 'true' }).returning({ id: users.id });
        }
        if (!user) throw new ClinicStaffError('INVITE_FAILED', 'Unable to create invitation', 500);

        const [credential] = await tx.select({ id: accounts.id })
          .from(accounts)
          .where(and(eq(accounts.userId, user.id), eq(accounts.providerId, 'credential')))
          .limit(1);

        const [existing] = await tx.select({ id: clinicMemberships.id })
          .from(clinicMemberships)
          .where(and(eq(clinicMemberships.clinicId, clinicId), eq(clinicMemberships.userId, user.id)))
          .limit(1);
        if (existing) throw new ClinicStaffError('MEMBERSHIP_EXISTS', 'This user already belongs to the clinic', 409);

        const [membership] = await tx.insert(clinicMemberships).values({
          clinicId,
          userId: user.id,
          role: input.role,
          branchId: input.branchId,
          dentistId: input.role === 'dentist' ? input.dentistId : null,
          isActive: 'true',
          invitedAt: now,
          joinedAt: credential ? now : null,
        }).returning({ id: clinicMemberships.id });
        if (!membership) throw new ClinicStaffError('INVITE_FAILED', 'Unable to create invitation', 500);

        await audit(tx as unknown as DB, actor, clinicId, membership.id, AuditAction.MEMBER_INVITED, {
          role: input.role,
          branchId: input.branchId,
          dentistId: input.role === 'dentist' ? input.dentistId : null,
          delivery: credential ? 'existing_account' : 'pending_provider',
        });
        return { membershipId: membership.id, delivery: credential ? 'existing_account' as const : 'pending_provider' as const };
      });
    },

    resendInvite: async (clinicId: string, membershipId: string, actor: StaffActor) => database.transaction(async (tx) => {
      const [membership] = await tx.select({ id: clinicMemberships.id, joinedAt: clinicMemberships.joinedAt, isActive: clinicMemberships.isActive })
        .from(clinicMemberships)
        .where(and(eq(clinicMemberships.id, membershipId), eq(clinicMemberships.clinicId, clinicId)))
        .limit(1);
      if (!membership) throw new ClinicStaffError('MEMBERSHIP_NOT_FOUND', 'Staff membership not found', 404);
      if (membership.joinedAt || membership.isActive !== 'true') throw new ClinicStaffError('INVITE_NOT_PENDING', 'Only active pending invitations can be resent', 409);
      await tx.update(clinicMemberships).set({ invitedAt: new Date().toISOString(), updatedAt: new Date() }).where(eq(clinicMemberships.id, membershipId));
      await audit(tx as unknown as DB, actor, clinicId, membershipId, AuditAction.MEMBER_INVITE_RESENT, { delivery: 'pending_provider' });
      return { membershipId, delivery: 'pending_provider' as const };
    }),

    update: async (clinicId: string, membershipId: string, input: StaffMutation, actor: StaffActor) => {
      await assertBranch(database, clinicId, input.branchId ?? null);
      return database.transaction(async (tx) => {
        const [membership] = await tx.select({
          id: clinicMemberships.id,
          userId: clinicMemberships.userId,
          role: clinicMemberships.role,
          branchId: clinicMemberships.branchId,
          dentistId: clinicMemberships.dentistId,
          isActive: clinicMemberships.isActive,
        }).from(clinicMemberships).where(and(eq(clinicMemberships.id, membershipId), eq(clinicMemberships.clinicId, clinicId))).limit(1);
        if (!membership) throw new ClinicStaffError('MEMBERSHIP_NOT_FOUND', 'Staff membership not found', 404);
        if (membership.userId === actor.id) throw new ClinicStaffError('SELF_ELEVATION_DENIED', 'You cannot change your own role, branch, or activation state', 403);
        if ((membership.role === 'clinic_owner' || input.role === 'clinic_owner') && actor.role !== 'clinic_owner') {
          throw new ClinicStaffError('OWNER_REQUIRED', 'Only a clinic owner can manage owner access', 403);
        }
        const removesOwner = membership.role === 'clinic_owner' && (input.role && input.role !== 'clinic_owner' || input.isActive === false);
        if (removesOwner) await assertOwnerRemains(tx as unknown as DB, clinicId, membershipId);
        const nextRole = input.role ?? membership.role;
        const nextBranchId = input.branchId !== undefined ? input.branchId : membership.branchId;
        const nextDentistId = input.role && input.role !== 'dentist'
          ? null
          : input.dentistId !== undefined
            ? input.dentistId
            : membership.dentistId;
        if (nextRole === 'dentist') await assertDentistLink(tx as unknown as DB, clinicId, nextDentistId, nextBranchId);
        else if (input.dentistId) throw new ClinicStaffError('DENTIST_ROLE_REQUIRED', 'A dentist profile can only be linked to the Dentist role', 422);

        await tx.update(clinicMemberships).set({
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
          ...(input.dentistId !== undefined || input.role !== undefined ? { dentistId: nextDentistId } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive ? 'true' : 'false' } : {}),
          updatedAt: new Date(),
        }).where(and(eq(clinicMemberships.id, membershipId), eq(clinicMemberships.clinicId, clinicId)));

        if (input.role !== undefined && input.role !== membership.role) {
          await tx.delete(clinicMembershipPermissions).where(eq(clinicMembershipPermissions.membershipId, membershipId));
          await audit(tx as unknown as DB, actor, clinicId, membershipId, AuditAction.MEMBER_ROLE_CHANGED, { from: membership.role, to: input.role });
        }
        if (input.branchId !== undefined && input.branchId !== membership.branchId) {
          await audit(tx as unknown as DB, actor, clinicId, membershipId, AuditAction.MEMBER_BRANCH_CHANGED, { from: membership.branchId, to: input.branchId });
        }
        if (nextDentistId !== membership.dentistId) {
          await audit(tx as unknown as DB, actor, clinicId, membershipId, AuditAction.MEMBER_ROLE_CHANGED, { dentistProfileLinked: nextDentistId, previousDentistId: membership.dentistId });
        }
        if (input.isActive !== undefined && input.isActive !== (membership.isActive === 'true')) {
          await audit(tx as unknown as DB, actor, clinicId, membershipId, AuditAction.MEMBER_STATUS_CHANGED, { isActive: input.isActive });
        }
        return { membershipId };
      });
    },

    /**
     * Assigns an existing staff member to an ADDITIONAL branch within the
     * same clinic — a second (or third...) clinicMemberships row for the
     * same user, matching the same pattern dentistBranchAssignments already
     * uses for dentists. No new user account is ever created here; this is
     * exactly "assign to multiple branches without duplicate accounts."
     */
    addBranchAssignment: async (clinicId: string, userId: string, branchId: string, actor: StaffActor) => {
      await assertBranch(database, clinicId, branchId);
      return database.transaction(async (tx) => {
        const existingRows = await tx.select({ id: clinicMemberships.id, role: clinicMemberships.role, branchId: clinicMemberships.branchId, dentistId: clinicMemberships.dentistId })
          .from(clinicMemberships).where(and(eq(clinicMemberships.clinicId, clinicId), eq(clinicMemberships.userId, userId), eq(clinicMemberships.isActive, 'true')));
        if (!existingRows.length) throw new ClinicStaffError('MEMBERSHIP_NOT_FOUND', 'This person has no active membership in this clinic yet — invite them first', 404);
        if (existingRows.some((row) => row.branchId === null)) throw new ClinicStaffError('ALREADY_CLINIC_WIDE', 'This staff member already has clinic-wide access', 409);
        if (existingRows.some((row) => row.branchId === branchId)) throw new ClinicStaffError('ASSIGNMENT_EXISTS', 'This staff member is already assigned to this branch', 409);
        const role = existingRows[0].role;
        const dentistId = existingRows[0].dentistId;
        if (role === 'clinic_owner' && actor.role !== 'clinic_owner') throw new ClinicStaffError('OWNER_REQUIRED', 'Only a clinic owner can manage owner access', 403);
        if (role === 'dentist') await assertDentistLink(tx as unknown as DB, clinicId, dentistId, branchId);
        const now = new Date().toISOString();
        const [created] = await tx.insert(clinicMemberships).values({ clinicId, userId, role, branchId, dentistId, isActive: 'true', invitedAt: now, joinedAt: now }).returning({ id: clinicMemberships.id });
        if (!created) throw new ClinicStaffError('ASSIGNMENT_FAILED', 'Unable to add this branch assignment', 500);
        await audit(tx as unknown as DB, actor, clinicId, created.id, AuditAction.MEMBER_BRANCH_ASSIGNMENT_ADDED, { userId, branchId, role });
        return { membershipId: created.id };
      });
    },

    remove: async (clinicId: string, membershipId: string, actor: StaffActor) => database.transaction(async (tx) => {
      const [membership] = await tx.select({ id: clinicMemberships.id, userId: clinicMemberships.userId, role: clinicMemberships.role })
        .from(clinicMemberships)
        .where(and(eq(clinicMemberships.id, membershipId), eq(clinicMemberships.clinicId, clinicId)))
        .limit(1);
      if (!membership) throw new ClinicStaffError('MEMBERSHIP_NOT_FOUND', 'Staff membership not found', 404);
      if (membership.userId === actor.id) throw new ClinicStaffError('SELF_REMOVAL_DENIED', 'You cannot remove your own membership', 403);
      if (membership.role === 'clinic_owner') {
        if (actor.role !== 'clinic_owner') throw new ClinicStaffError('OWNER_REQUIRED', 'Only a clinic owner can remove another owner', 403);
        await assertOwnerRemains(tx as unknown as DB, clinicId, membershipId);
      }
      const otherRows = await tx.select({ id: clinicMemberships.id }).from(clinicMemberships).where(and(eq(clinicMemberships.clinicId, clinicId), eq(clinicMemberships.userId, membership.userId), ne(clinicMemberships.id, membershipId)));
      await tx.delete(clinicMemberships).where(and(eq(clinicMemberships.id, membershipId), eq(clinicMemberships.clinicId, clinicId)));
      await audit(tx as unknown as DB, actor, clinicId, membershipId, otherRows.length ? AuditAction.MEMBER_BRANCH_ASSIGNMENT_REMOVED : AuditAction.MEMBER_REMOVED, { previousRole: membership.role });
      return { membershipId };
    }),

    updatePermission: async (clinicId: string, membershipId: string, permissionKey: string, isEnabled: boolean, actor: StaffActor) => database.transaction(async (tx) => {
      const [membership] = await tx.select({ id: clinicMemberships.id, userId: clinicMemberships.userId })
        .from(clinicMemberships)
        .where(and(eq(clinicMemberships.id, membershipId), eq(clinicMemberships.clinicId, clinicId), eq(clinicMemberships.isActive, 'true')))
        .limit(1);
      if (!membership) throw new ClinicStaffError('MEMBERSHIP_NOT_FOUND', 'Staff membership not found', 404);
      if (membership.userId === actor.id) throw new ClinicStaffError('SELF_ELEVATION_DENIED', 'You cannot change your own permission overrides', 403);
      const [updated] = await tx.insert(clinicMembershipPermissions).values({ clinicId, membershipId, permissionKey, isEnabled, updatedBy: actor.id })
        .onConflictDoUpdate({
          target: [clinicMembershipPermissions.membershipId, clinicMembershipPermissions.permissionKey],
          set: { isEnabled, updatedBy: actor.id, updatedAt: new Date() },
        }).returning({ id: clinicMembershipPermissions.id });
      if (!updated) throw new ClinicStaffError('PERMISSION_UPDATE_FAILED', 'Unable to update permission', 500);
      await writeAudit(tx as unknown as DB, {
        actorId: actor.id,
        actorEmail: actor.email,
        clinicId,
        entityType: 'clinic_membership_permission',
        entityId: updated.id,
        action: AuditAction.PERMISSION_UPDATED,
        metadata: JSON.stringify({ membershipId, permissionKey, isEnabled }),
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
      return { membershipId, permissionKey, isEnabled };
    }),
  };
}
