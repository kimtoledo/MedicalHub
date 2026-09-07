import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { createSubscriptionOperationsService } from '../src/clinic/subscription-operations-service.js';

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

describe('SubscriptionOperationsService.listAvailablePackages', () => {
  it('joins each active package with its capacity limits, keyed by metric', async () => {
    const database = databaseWithQueue([
      [ // active packages
        { id: 'pkg-solo', name: 'Solo', slug: 'solo', description: 'For one dentist', priceDisplay: '₱1,500/mo', sortOrder: '0' },
        { id: 'pkg-clinic', name: 'Clinic', slug: 'clinic', description: null, priceDisplay: '₱4,500/mo', sortOrder: '1' },
      ],
      [ // package_limits rows, across both packages
        { packageId: 'pkg-solo', metric: 'dentists', limit: 1 },
        { packageId: 'pkg-solo', metric: 'branches', limit: 1 },
        { packageId: 'pkg-clinic', metric: 'dentists', limit: 5 },
        { packageId: 'pkg-clinic', metric: 'staff_clinic_admin', limit: null }, // explicit unlimited
      ],
    ]);
    const service = createSubscriptionOperationsService(database);

    const result = await service.listAvailablePackages();

    expect(result).toEqual([
      { id: 'pkg-solo', name: 'Solo', slug: 'solo', description: 'For one dentist', priceDisplay: '₱1,500/mo', limits: { dentists: 1, branches: 1 } },
      { id: 'pkg-clinic', name: 'Clinic', slug: 'clinic', description: null, priceDisplay: '₱4,500/mo', limits: { dentists: 5, staff_clinic_admin: null } },
    ]);
    // `sortOrder` is an internal ordering field, not part of the public shape.
    expect(result.every((pkg) => !('sortOrder' in pkg))).toBe(true);
  });

  it('returns an empty limits map for a package with no package_limits rows at all (deny-by-default)', async () => {
    const database = databaseWithQueue([
      [{ id: 'pkg-branches', name: 'Branches', slug: 'branches', description: null, priceDisplay: 'Contact us', sortOrder: '2' }],
      [],
    ]);
    const service = createSubscriptionOperationsService(database);

    const result = await service.listAvailablePackages();

    expect(result).toEqual([
      { id: 'pkg-branches', name: 'Branches', slug: 'branches', description: null, priceDisplay: 'Contact us', limits: {} },
    ]);
  });
});
