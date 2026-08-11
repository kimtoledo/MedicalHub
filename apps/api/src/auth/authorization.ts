import { and, eq, isNull } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { clinicMemberships, users } from '@dentra/db/schema';
import type { AuthorizationContext, ClinicAccess, PlatformRole } from './types.js';

export function isSuperAdmin(context: AuthorizationContext): boolean {
  return context.user.platformRole === 'super_admin';
}

export function getClinicAccess(
  context: AuthorizationContext,
  clinicId: string,
): ClinicAccess[] {
  return context.clinicMemberships.filter(
    (membership) => membership.clinicId === clinicId,
  );
}

export function hasClinicAccess(
  context: AuthorizationContext,
  clinicId: string,
  allowedRoles?: ClinicAccess['role'][],
): boolean {
  const memberships = getClinicAccess(context, clinicId);

  return allowedRoles
    ? memberships.some((membership) => allowedRoles.includes(membership.role))
    : memberships.length > 0;
}

export function createAuthorizationResolver(database: DB) {
  return async (userId: string): Promise<AuthorizationContext | null> => {
    const [user] = await database
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        platformRole: users.platformRole,
      })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.isActive, 'true'),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!user) {
      return null;
    }

    const memberships = await database
      .select({
        clinicId: clinicMemberships.clinicId,
        branchId: clinicMemberships.branchId,
        role: clinicMemberships.role,
        dentistId: clinicMemberships.dentistId,
      })
      .from(clinicMemberships)
      .where(
        and(
          eq(clinicMemberships.userId, user.id),
          eq(clinicMemberships.isActive, 'true'),
        ),
      );

    const platformRole: PlatformRole | null = user.platformRole;
    const strategies: AuthorizationContext['strategies'] = [];

    if (platformRole === 'super_admin') {
      strategies.push('superAdmin');
    }
    if (memberships.length > 0) {
      strategies.push('clinicMember');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        platformRole,
      },
      strategies,
      clinicMemberships: memberships,
    };
  };
}
