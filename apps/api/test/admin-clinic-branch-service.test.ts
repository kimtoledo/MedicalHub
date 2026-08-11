import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { AuditAction } from '@dentra/shared';
import {
  AdminClinicBranchCreationError,
  createAdminClinicBranchCreationService,
} from '../src/admin/clinics-service.js';

type ExistingBranch = { isMain: boolean };

function createDatabaseDouble(options?: {
  clinicExists?: boolean;
  existingBranches?: ExistingBranch[];
}) {
  const clinicRows = options?.clinicExists === false ? [] : [{ id: 'clinic-id' }];
  const existingBranches = options?.existingBranches ?? [];
  const selectFor = vi.fn(async () => clinicRows);
  const select = vi
    .fn()
    .mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: () => ({ for: selectFor }),
        }),
      }),
    }))
    .mockImplementationOnce(() => ({
      from: () => ({ where: async () => existingBranches }),
    }));

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
});
