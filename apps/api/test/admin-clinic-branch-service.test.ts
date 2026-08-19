import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { AuditAction } from '@dentra/shared';
import {
  AdminClinicBranchCreationError,
  createAdminClinicBranchCreationService,
} from '../src/admin/clinics-service.js';

type ExistingBranch = { isMain: boolean };

/**
 * A chainable stub that is ALSO thenable, so it works both as an
 * intermediate link (`.from().where().orderBy()`) and as the terminal
 * awaited call (`await select(...).limit(1)` or `.limit(1).for('update')`),
 * regardless of exactly how many chain methods the real query builds.
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

function createDatabaseDouble(options?: {
  clinicExists?: boolean;
  existingBranches?: ExistingBranch[];
  /** Override lookup result for the capacity check. Defaults to unlimited. */
  capacityOverride?: unknown[];
  /** Live branch-count result the capacity check's countUsage query sees. */
  capacityUsage?: unknown[];
}) {
  const clinicRows = options?.clinicExists === false ? [] : [{ id: 'clinic-id' }];
  const existingBranches = options?.existingBranches ?? [];
  const capacityOverride = options?.capacityOverride ?? [{ limit: null }];
  // Call order: 1) clinic row lock, 2) capacity override lookup, 3) [only
  // when the resolved limit isn't unlimited] live branch-count usage query,
  // 4) existing-branches fetch (business logic's own "is there a main
  // branch already" check, separate from the capacity system).
  const selectQueue = capacityOverride[0] && (capacityOverride[0] as any).limit === null
    ? [clinicRows, capacityOverride, existingBranches]
    : [clinicRows, capacityOverride, options?.capacityUsage ?? [{ value: 0 }], existingBranches];
  let selectCallIndex = 0;
  const select = vi.fn(() => chainable(selectQueue[selectCallIndex++]));

  const createdAt = new Date('2026-08-11T00:00:00.000Z');
  const branchReturning = vi.fn(async () => [{
    id: 'branch-id',
    clinicId: 'clinic-id',
    name: 'BGC Branch',
    isMain: true,
    isActive: true,
    phone: null,
    email: null,
    address: null,
    city: null,
    province: null,
    createdAt,
  }]);
  const branchValues = vi.fn(() => ({ returning: branchReturning }));
  const auditValues = vi.fn(async () => undefined);
  const insert = vi
    .fn()
    .mockImplementationOnce(() => ({ values: branchValues }))
    .mockImplementationOnce(() => ({ values: auditValues }));
  const transaction = vi.fn(async (callback: (transaction: unknown) => unknown) =>
    callback({ select, insert }),
  );

  return {
    auditValues,
    branchValues,
    database: { transaction } as unknown as DB,
  };
}

const actor = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@dentra.ph',
  ipAddress: '127.0.0.1',
  userAgent: 'Dentra API test',
};

const input = {
  name: 'BGC Branch',
  isMain: false,
  phone: null,
  email: null,
  address: null,
  city: null,
  province: null,
};

describe('createAdminClinicBranchCreationService', () => {
  it('automatically makes the first branch main and writes an audit event', async () => {
    const { auditValues, branchValues, database } = createDatabaseDouble();
    const service = createAdminClinicBranchCreationService(database);

    await service.create('clinic-id', input, actor);

    expect(branchValues).toHaveBeenCalledWith(
      expect.objectContaining({ clinicId: 'clinic-id', isMain: true }),
    );
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: actor.id,
        actorEmail: actor.email,
        clinicId: 'clinic-id',
        entityType: 'branch',
        entityId: 'branch-id',
        action: AuditAction.BRANCH_CREATED,
        metadata: JSON.stringify({ isMain: true }),
      }),
    );
  });

  it('allows a non-main branch when an active main branch exists', async () => {
    const { branchValues, database } = createDatabaseDouble({
      existingBranches: [{ isMain: true }],
    });
    const service = createAdminClinicBranchCreationService(database);

    await service.create('clinic-id', input, actor);

    expect(branchValues).toHaveBeenCalledWith(
      expect.objectContaining({ clinicId: 'clinic-id', isMain: false }),
    );
  });

  it('rejects a second active main branch without writing data', async () => {
    const { auditValues, branchValues, database } = createDatabaseDouble({
      existingBranches: [{ isMain: true }],
    });
    const service = createAdminClinicBranchCreationService(database);

    await expect(
      service.create('clinic-id', { ...input, isMain: true }, actor),
    ).rejects.toMatchObject({ code: 'MAIN_BRANCH_EXISTS' });
    expect(branchValues).not.toHaveBeenCalled();
    expect(auditValues).not.toHaveBeenCalled();
  });

  it('returns a typed not-found error without writing data', async () => {
    const { auditValues, branchValues, database } = createDatabaseDouble({
      clinicExists: false,
    });
    const service = createAdminClinicBranchCreationService(database);

    await expect(
      service.create('missing-clinic', input, actor),
    ).rejects.toBeInstanceOf(AdminClinicBranchCreationError);
    expect(branchValues).not.toHaveBeenCalled();
    expect(auditValues).not.toHaveBeenCalled();
  });

  it('rejects branch creation with BRANCH_LIMIT_REACHED when at the resolved capacity limit', async () => {
    const { auditValues, branchValues, database } = createDatabaseDouble({
      capacityOverride: [{ limit: 1 }],
      capacityUsage: [{ value: 1 }],
    });
    const service = createAdminClinicBranchCreationService(database);

    await expect(
      service.create('clinic-id', input, actor),
    ).rejects.toMatchObject({ code: 'BRANCH_LIMIT_REACHED' });
    expect(branchValues).not.toHaveBeenCalled();
    expect(auditValues).not.toHaveBeenCalled();
  });
});
