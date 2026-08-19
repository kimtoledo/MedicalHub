import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { createClinicStaffService, ClinicStaffError } from '../src/clinic/staff-service.js';

const clinicId = 'clinic-1';
const actor = { id: 'admin-1', email: 'admin@test', role: 'clinic_admin' as const };

/**
 * A chainable stub that is ALSO thenable, so it works both as an
 * intermediate link (`.from().where()`) and as the terminal awaited call
 * (`await select(...).limit(1)` or `.limit(1).for('update')`), regardless
 * of exactly how many chain methods the real query builds.
 */
function chainable(value: unknown): any {
  const obj: any = {
    from: () => obj,
    where: () => obj,
    orderBy: () => obj,
    limit: () => obj,
    for: () => Promise.resolve(value),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(value).then(resolve, reject),
  };
  return obj;
}

/**
 * Builds a `database` double for invite() with `branchId: null` and a
 * non-dentist role (so the pre-transaction assertBranch/assertDentistLink
 * checks in invite() short-circuit without querying). The select queue
 * covers, in order: clinic lock, existing-user-by-email lookup, credential
 * lookup, existing-membership lookup, then the capacity check's
 * override/subscription/package-limit/usage-count lookups.
 */
function databaseForInvite(usageCount: number, limit: number) {
  const selectQueue = [
    [{ id: 'clinic-1' }],       // clinic lock
    [{ id: 'user-1' }],         // existing user by email
    [],                         // no credential yet
    [],                         // not already a member
    [],                         // no override
    [{ packageId: 'pkg-1' }],   // active subscription
    [{ limit }],                // package_limits row for this metric
    [{ value: usageCount }],    // live usage count
  ];
  let index = 0;
  const select = vi.fn(() => chainable(selectQueue[index++] ?? []));

  const membershipReturning = vi.fn(async () => [{ id: 'membership-1' }]);
  const membershipValues = vi.fn(() => ({ returning: membershipReturning }));
  const auditValues = vi.fn(async () => undefined);
  const insert = vi.fn()
    .mockImplementationOnce(() => ({ values: membershipValues }))
    .mockImplementationOnce(() => ({ values: auditValues }));

  const tx = { select, insert };
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(tx) } as unknown as DB;
  return { database, membershipValues, auditValues, insert };
}

describe('createClinicStaffService.invite — seat capacity', () => {
  it('creates the membership when usage is under the resolved seat limit', async () => {
    const { database, membershipValues, auditValues } = databaseForInvite(0, 1);
    const service = createClinicStaffService(database);

    const result = await service.invite(
      clinicId,
      { name: 'New Receptionist', email: 'recep@test.ph', role: 'receptionist', branchId: null },
      actor,
    );

    expect(result.membershipId).toBe('membership-1');
    expect(membershipValues).toHaveBeenCalledWith(expect.objectContaining({ clinicId, role: 'receptionist' }));
    expect(auditValues).toHaveBeenCalled();
  });

  it('rejects the invite with SEAT_LIMIT_REACHED when the role is already at its seat cap', async () => {
    const { database, membershipValues, auditValues } = databaseForInvite(1, 1);
    const service = createClinicStaffService(database);

    const error = await service.invite(
      clinicId,
      { name: 'Second Receptionist', email: 'recep2@test.ph', role: 'receptionist', branchId: null },
      actor,
    ).catch((e) => e);

    expect(error).toBeInstanceOf(ClinicStaffError);
    expect(error).toMatchObject({ code: 'SEAT_LIMIT_REACHED', statusCode: 409 });
    expect(membershipValues).not.toHaveBeenCalled();
    expect(auditValues).not.toHaveBeenCalled();
  });
});
