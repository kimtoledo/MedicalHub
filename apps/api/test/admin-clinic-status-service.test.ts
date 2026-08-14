import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { AuditAction } from '@dentra/shared';
import {
  AdminClinicStatusError,
  createAdminClinicStatusService,
  type ClinicStatus,
} from '../src/admin/clinics-service.js';

function createDatabaseDouble(currentStatus?: ClinicStatus) {
  const selectLimit = vi.fn(async () =>
    currentStatus ? [{ status: currentStatus }] : [],
  );
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));

  const updatedAt = new Date('2026-08-11T00:00:00.000Z');
  const updateReturning = vi.fn(async () => [{
    id: '00000000-0001-0000-0000-000000000001',
    status: 'active' as const,
    updatedAt,
  }]);
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  const insertValues = vi.fn(async () => undefined);
  const insert = vi.fn(() => ({ values: insertValues }));
  const transaction = vi.fn(async (callback: (transaction: unknown) => unknown) =>
    callback({ select, update, insert }),
  );

  return {
    database: { transaction } as unknown as DB,
    insertValues,
    updateSet,
  };
}

const actor = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@dentra.ph',
  ipAddress: '127.0.0.1',
  userAgent: 'Dentra API test',
};

describe('createAdminClinicStatusService', () => {
  it.each([
    ['trial', 'active', AuditAction.CLINIC_ACTIVATED],
    ['active', 'suspended', AuditAction.CLINIC_SUSPENDED],
    ['suspended', 'active', AuditAction.CLINIC_REACTIVATED],
    ['active', 'archived', AuditAction.CLINIC_ARCHIVED],
    ['archived', 'active', AuditAction.CLINIC_REACTIVATED],
  ] as const)(
    'records the %s to %s transition with action %s',
    async (previousStatus, nextStatus, auditAction) => {
      const { database, insertValues, updateSet } =
        createDatabaseDouble(previousStatus);
      const service = createAdminClinicStatusService(database);

      await service.updateStatus(
        '00000000-0001-0000-0000-000000000001',
        nextStatus,
        actor,
      );

      expect(updateSet).toHaveBeenCalledWith({ status: nextStatus, archivedAt: nextStatus === 'archived' ? expect.any(Date) : null });
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: actor.id,
          actorEmail: actor.email,
          action: auditAction,
          metadata: JSON.stringify({ previousStatus, nextStatus }),
        }),
      );
    },
  );

  it('rejects an unsupported transition without updating or auditing', async () => {
    const { database, insertValues, updateSet } = createDatabaseDouble('active');
    const service = createAdminClinicStatusService(database);

    await expect(
      service.updateStatus(
        '00000000-0001-0000-0000-000000000001',
        'active',
        actor,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
    expect(updateSet).not.toHaveBeenCalled();
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('returns a typed not-found error without writing data', async () => {
    const { database, insertValues, updateSet } = createDatabaseDouble();
    const service = createAdminClinicStatusService(database);

    await expect(
      service.updateStatus(
        '00000000-0001-0000-0000-000000000001',
        'archived',
        actor,
      ),
    ).rejects.toBeInstanceOf(AdminClinicStatusError);
    expect(updateSet).not.toHaveBeenCalled();
    expect(insertValues).not.toHaveBeenCalled();
  });
});
