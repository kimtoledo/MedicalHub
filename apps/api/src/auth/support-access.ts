import { and, eq, gt } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { supportAccessRequests } from '@dentra/db/schema';
import type { AuthorizationContext } from './types.js';
import { isSuperAdmin } from './authorization.js';

/**
 * True only when the caller is a Super Admin AND holds an active
 * (approved, unexpired) support-access grant for this specific clinic.
 * Replaces the old "isSuperAdmin() always bypasses hasClinicAccess()"
 * pattern for clinic-scoped data routes (patients, encounters, hmo,
 * remote-consults, entitlements, clinic-ai) -- per the product decision
 * that ALL such routes require a justified, time-boxed grant, not an
 * unconditional platform-role bypass. Platform-config routes (clinic
 * roster, packages, review moderation, etc.) are intentionally untouched.
 */
export async function hasActiveSupportGrant(database: DB, authorization: AuthorizationContext, clinicId: string): Promise<boolean> {
  if (!isSuperAdmin(authorization)) return false;
  const [grant] = await database
    .select({ id: supportAccessRequests.id })
    .from(supportAccessRequests)
    .where(and(
      eq(supportAccessRequests.clinicId, clinicId),
      eq(supportAccessRequests.requestedBy, authorization.user.id),
      eq(supportAccessRequests.status, 'approved'),
      gt(supportAccessRequests.expiresAt, new Date()),
    ))
    .limit(1);
  return Boolean(grant);
}
