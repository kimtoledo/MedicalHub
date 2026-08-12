import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { branches, clinicMemberships, clinics, users } from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';

export type AccountProfileUpdate = {
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
};

export type AccountProfileActor = {
  id: string;
  email: string;
  clinicId: string;
  ipAddress?: string;
  userAgent?: string;
};

export type AccountProfile = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
  };
  memberships: Array<{
    clinicId: string;
    clinicName: string;
    branchId: string | null;
    branchName: string | null;
    role: typeof clinicMemberships.$inferSelect.role;
  }>;
};

export class AccountProfileError extends Error {
  constructor(
    public readonly code: 'PROFILE_NOT_FOUND',
    message: string,
    public readonly statusCode = 404,
  ) {
    super(message);
  }
}

export type AccountProfileService = {
  get: (userId: string) => Promise<AccountProfile | null>;
  update: (
    userId: string,
    input: AccountProfileUpdate,
    actor: AccountProfileActor,
  ) => Promise<AccountProfile>;
};

export function createAccountProfileService(database: DB): AccountProfileService {
  async function get(userId: string): Promise<AccountProfile | null> {
    const [user] = await database
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, 'true'), isNull(users.deletedAt)))
      .limit(1);

    if (!user) return null;

    const memberships = await database
      .select({
        clinicId: clinicMemberships.clinicId,
        clinicName: clinics.name,
        branchId: clinicMemberships.branchId,
        branchName: branches.name,
        role: clinicMemberships.role,
      })
      .from(clinicMemberships)
      .innerJoin(clinics, eq(clinicMemberships.clinicId, clinics.id))
      .leftJoin(branches, eq(clinicMemberships.branchId, branches.id))
      .where(and(
        eq(clinicMemberships.userId, userId),
        eq(clinicMemberships.isActive, 'true'),
        inArray(clinics.status, ['trial', 'active']),
        isNull(clinics.deletedAt),
      ))
      .orderBy(asc(clinics.name), asc(branches.name));

    const firstName = user.firstName?.trim() || user.name.trim().split(/\s+/)[0] || '';
    const lastName = user.lastName?.trim() || user.name.trim().split(/\s+/).slice(1).join(' ');

    return {
      user: { ...user, firstName, lastName },
      memberships,
    };
  }

  return {
    get,
    update: async (userId, input, actor) => {
      await database.transaction(async (transaction) => {
        const [current] = await transaction
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            phone: users.phone,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(and(eq(users.id, userId), eq(users.isActive, 'true'), isNull(users.deletedAt)))
          .limit(1)
          .for('update');

        if (!current) {
          throw new AccountProfileError('PROFILE_NOT_FOUND', 'Account profile not found');
        }

        const changedFields = (Object.keys(input) as Array<keyof AccountProfileUpdate>)
          .filter((field) => current[field] !== input[field]);

        if (changedFields.length === 0) return;

        await transaction
          .update(users)
          .set({
            ...input,
            name: `${input.firstName} ${input.lastName}`.trim(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId: actor.clinicId,
          entityType: 'user_profile',
          entityId: userId,
          action: AuditAction.ACCOUNT_PROFILE_UPDATED,
          metadata: JSON.stringify({ fields: changedFields }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
      });

      const profile = await get(userId);
      if (!profile) {
        throw new AccountProfileError('PROFILE_NOT_FOUND', 'Account profile not found');
      }
      return profile;
    },
  };
}
