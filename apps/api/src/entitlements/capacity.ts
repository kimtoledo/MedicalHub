import { and, count, countDistinct, desc, eq, gt, isNull, lte, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import {
  branches,
  clinicLimitOverrides,
  clinicMemberships,
  clinicSubscriptions,
  dentistBranchAssignments,
  packageLimits,
} from '@dentra/db/schema';
import { CapacityMetric, ClinicRole } from '@dentra/shared';

// Same technique as write-audit.ts's AuditWriter: accept either the base DB
// handle or an in-flight transaction without forcing callers to cast.
type DBTransaction = Parameters<Parameters<DB['transaction']>[0]>[0];
type Queryable = DB | DBTransaction;

export class ClinicCapacityError extends Error {
  constructor(
    public readonly metric: CapacityMetric,
    public readonly limit: number,
    public readonly current: number,
  ) {
    super(`Capacity limit reached for ${metric}: ${current}/${limit} used`);
    this.name = 'ClinicCapacityError';
  }
}

const STAFF_METRIC_ROLE: Partial<Record<CapacityMetric, ClinicRole>> = {
  [CapacityMetric.STAFF_CLINIC_ADMIN]: ClinicRole.CLINIC_ADMIN,
  [CapacityMetric.STAFF_RECEPTIONIST]: ClinicRole.RECEPTIONIST,
  [CapacityMetric.STAFF_DENTAL_ASSISTANT]: ClinicRole.DENTAL_ASSISTANT,
  [CapacityMetric.STAFF_CASHIER]: ClinicRole.CASHIER,
  [CapacityMetric.STAFF_INVENTORY_STAFF]: ClinicRole.INVENTORY_STAFF,
};

/**
 * Effective limit for one metric: clinic override (if any, unexpired) ->
 * the clinic's current package base -> 0 (deny-by-default, no clinic
 * subscription or no package_limits row for this metric). NULL means
 * unlimited and is only ever returned from an explicit override or
 * package_limits row — never implied by an absent row.
 */
async function resolveLimit(
  database: Queryable,
  clinicId: string,
  metric: CapacityMetric,
  now = new Date(),
): Promise<number | null> {
  const [override] = await database
    .select({ limit: clinicLimitOverrides.limit })
    .from(clinicLimitOverrides)
    .where(and(
      eq(clinicLimitOverrides.clinicId, clinicId),
      eq(clinicLimitOverrides.metric, metric),
      or(isNull(clinicLimitOverrides.expiresAt), gt(clinicLimitOverrides.expiresAt, now)),
    ))
    .orderBy(desc(clinicLimitOverrides.createdAt))
    .limit(1);
  if (override) return override.limit;

  const [subscription] = await database
    .select({ packageId: clinicSubscriptions.packageId })
    .from(clinicSubscriptions)
    .where(and(
      eq(clinicSubscriptions.clinicId, clinicId),
      lte(clinicSubscriptions.startsAt, now),
      or(isNull(clinicSubscriptions.expiresAt), gt(clinicSubscriptions.expiresAt, now)),
    ))
    .orderBy(desc(clinicSubscriptions.startsAt))
    .limit(1);
  if (!subscription) return 0;

  const [base] = await database
    .select({ limit: packageLimits.limit })
    .from(packageLimits)
    .where(and(eq(packageLimits.packageId, subscription.packageId), eq(packageLimits.metric, metric)))
    .limit(1);
  return base ? base.limit : 0;
}

/**
 * Live count against the authoritative source tables — never a stored
 * counter, so it can't drift from reality. Counts DISTINCT dentists/users so
 * a person with more than one row for the same clinic (e.g. a dentist
 * affiliated with two branches, or a staff member with a second branch
 * assignment) is only ever counted once.
 */
async function countUsage(database: Queryable, clinicId: string, metric: CapacityMetric): Promise<number> {
  if (metric === CapacityMetric.DENTISTS) {
    const [row] = await database
      .select({ value: countDistinct(dentistBranchAssignments.dentistId) })
      .from(dentistBranchAssignments)
      .where(and(
        eq(dentistBranchAssignments.clinicId, clinicId),
        eq(dentistBranchAssignments.isActive, 'true'),
      ));
    return Number(row?.value ?? 0);
  }

  if (metric === CapacityMetric.BRANCHES) {
    const [row] = await database
      .select({ value: count() })
      .from(branches)
      .where(and(eq(branches.clinicId, clinicId), eq(branches.isActive, true), isNull(branches.deletedAt)));
    return Number(row?.value ?? 0);
  }

  const role = STAFF_METRIC_ROLE[metric];
  if (!role) return 0;
  const [row] = await database
    .select({ value: countDistinct(clinicMemberships.userId) })
    .from(clinicMemberships)
    .where(and(
      eq(clinicMemberships.clinicId, clinicId),
      eq(clinicMemberships.role, role),
      eq(clinicMemberships.isActive, 'true'),
    ));
  return Number(row?.value ?? 0);
}

/**
 * Throws ClinicCapacityError when adding one more unit for `metric` would
 * exceed the clinic's effective limit. Call this ONLY when the caller is
 * about to add exactly one brand-new distinct unit (a new branch row, a
 * new clinic member, a dentist not yet affiliated with ANY branch of this
 * clinic) — never to re-validate units that already exist. Run it inside
 * the same transaction as the insert, after the caller has locked the
 * clinic row, so concurrent requests serialize instead of both slipping
 * past the same limit.
 */
export async function assertClinicCapacity(
  database: Queryable,
  clinicId: string,
  metric: CapacityMetric,
): Promise<void> {
  const limit = await resolveLimit(database, clinicId, metric);
  if (limit === null) return;
  const current = await countUsage(database, clinicId, metric);
  if (current >= limit) throw new ClinicCapacityError(metric, limit, current);
}

export type ClinicCapacitySummaryItem = { metric: CapacityMetric; limit: number | null; used: number };

/** Read-only usage-vs-limit summary for every metric, for admin/clinic display. */
export async function getClinicCapacitySummary(
  database: Queryable,
  clinicId: string,
): Promise<ClinicCapacitySummaryItem[]> {
  return Promise.all(
    Object.values(CapacityMetric).map(async (metric) => ({
      metric,
      limit: await resolveLimit(database, clinicId, metric),
      used: await countUsage(database, clinicId, metric),
    })),
  );
}
