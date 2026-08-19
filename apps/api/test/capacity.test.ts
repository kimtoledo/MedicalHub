import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { CapacityMetric } from '@dentra/shared';
import { assertClinicCapacity, ClinicCapacityError, getClinicCapacitySummary } from '../src/entitlements/capacity.js';

/**
 * A chainable stub that is ALSO thenable, so it works as the terminal
 * awaited call regardless of exactly which chain methods
 * (from/where/orderBy/limit) the real query happens to build.
 */
function chainable(value: unknown): any {
  const obj: any = {
    from: () => obj,
    where: () => obj,
    orderBy: () => obj,
    limit: () => obj,
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(value).then(resolve, reject),
  };
  return obj;
}

function databaseWithQueue(queue: unknown[]): DB {
  let index = 0;
  const select = vi.fn(() => chainable(queue[index++] ?? []));
  return { select } as unknown as DB;
}

describe('assertClinicCapacity', () => {
  it('resolves without querying usage when an override grants unlimited (null)', async () => {
    const database = databaseWithQueue([[{ limit: null }]]);
    await expect(assertClinicCapacity(database, 'clinic-1', CapacityMetric.DENTISTS)).resolves.toBeUndefined();
    expect((database.select as any)).toHaveBeenCalledTimes(1);
  });

  it('falls back to the package base limit when no override exists, and allows usage under cap', async () => {
    const database = databaseWithQueue([
      [],                        // no override
      [{ packageId: 'pkg-1' }],  // active subscription
      [{ limit: 5 }],            // package_limits row
      [{ value: 2 }],            // live usage count
    ]);
    await expect(assertClinicCapacity(database, 'clinic-1', CapacityMetric.DENTISTS)).resolves.toBeUndefined();
  });

  it('throws ClinicCapacityError when usage is at the resolved limit', async () => {
    const database = databaseWithQueue([
      [],
      [{ packageId: 'pkg-1' }],
      [{ limit: 2 }],
      [{ value: 2 }],
    ]);
    const error = await assertClinicCapacity(database, 'clinic-1', CapacityMetric.DENTISTS).catch((e) => e);
    expect(error).toBeInstanceOf(ClinicCapacityError);
    expect(error).toMatchObject({ metric: CapacityMetric.DENTISTS, limit: 2, current: 2 });
  });

  it('denies by default (limit 0) when the clinic has no active subscription, blocking even zero usage', async () => {
    const database = databaseWithQueue([
      [],  // no override
      [],  // no active subscription -> resolveLimit short-circuits to 0
      [{ value: 0 }], // usage still gets counted against the 0 limit
    ]);
    const error = await assertClinicCapacity(database, 'clinic-1', CapacityMetric.BRANCHES).catch((e) => e);
    expect(error).toBeInstanceOf(ClinicCapacityError);
    expect(error).toMatchObject({ metric: CapacityMetric.BRANCHES, limit: 0, current: 0 });
  });

  it('denies by default (limit 0) when the subscription exists but the package has no row for this metric', async () => {
    const database = databaseWithQueue([
      [],                        // no override
      [{ packageId: 'pkg-1' }],  // active subscription
      [],                        // no package_limits row for this metric
      [{ value: 0 }],
    ]);
    const error = await assertClinicCapacity(database, 'clinic-1', CapacityMetric.STAFF_CASHIER).catch((e) => e);
    expect(error).toBeInstanceOf(ClinicCapacityError);
    expect(error).toMatchObject({ limit: 0 });
  });
});

describe('getClinicCapacitySummary', () => {
  it('returns one entry per CapacityMetric', async () => {
    const database = { select: vi.fn(() => chainable([])) } as unknown as DB;
    const summary = await getClinicCapacitySummary(database, 'clinic-1');
    expect(summary.map((item) => item.metric).sort()).toEqual([...Object.values(CapacityMetric)].sort());
    expect(summary.every((item) => item.limit === 0 && item.used === 0)).toBe(true);
  });
});
