import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { AuditAction } from '@dentra/shared';
import { createAdminDentistAffiliationService } from '../src/admin/dentists-service.js';

const actor = { id: 'admin-id', email: 'admin@dentra.ph', ipAddress: '127.0.0.1', userAgent: 'test' };
const dentistId = 'dentist-id';
const branchId = 'branch-id';
const clinicId = 'clinic-id';
const affiliationId = 'affiliation-id';

function selectable(rows: unknown[]) {
  return { from: () => ({
    innerJoin: () => ({ where: () => ({ limit: async () => rows }) }),
    where: () => ({ limit: async () => rows }),
  }) };
}

describe('createAdminDentistAffiliationService', () => {
  it('derives clinic scope from the branch and audits affiliation creation', async () => {
    const select = vi.fn()
      .mockImplementationOnce(() => selectable([{ id: dentistId }]))
      .mockImplementationOnce(() => selectable([{ branchId, clinicId }]))
      .mockImplementationOnce(() => selectable([]));
    const affiliation = { id: affiliationId, dentistId, clinicId, branchId, isActive: 'true' };
    const affiliationValues = vi.fn(() => ({ returning: async () => [affiliation] }));
    const auditValues = vi.fn(async () => undefined);
    const insert = vi.fn()
      .mockImplementationOnce(() => ({ values: affiliationValues }))
      .mockImplementationOnce(() => ({ values: auditValues }));
    const database = { transaction: async (callback: (tx: unknown) => unknown) => callback({ select, insert }) } as unknown as DB;

    const service = createAdminDentistAffiliationService(database);
    await service.add(dentistId, branchId, actor);

    expect(affiliationValues).toHaveBeenCalledWith({ dentistId, branchId, clinicId });
    expect(auditValues).toHaveBeenCalledWith(expect.objectContaining({
      clinicId, entityId: affiliationId, action: AuditAction.DENTIST_AFFILIATED,
      metadata: JSON.stringify({ dentistId, branchId }),
    }));
  });

  it('scopes removal by dentist and audits the state change', async () => {
    const existing = { id: affiliationId, dentistId, clinicId, branchId };
    const select = vi.fn(() => selectable([existing]));
    const updated = { ...existing, isActive: 'false' };
    const returning = vi.fn(async () => [updated]);
    const set = vi.fn(() => ({ where: () => ({ returning }) }));
    const update = vi.fn(() => ({ set }));
    const auditValues = vi.fn(async () => undefined);
    const insert = vi.fn(() => ({ values: auditValues }));
    const database = { transaction: async (callback: (tx: unknown) => unknown) => callback({ select, update, insert }) } as unknown as DB;

    const service = createAdminDentistAffiliationService(database);
    await service.remove(dentistId, affiliationId, actor);

    expect(set).toHaveBeenCalledWith({ isActive: 'false' });
    expect(auditValues).toHaveBeenCalledWith(expect.objectContaining({
      clinicId, entityId: affiliationId, action: AuditAction.DENTIST_UNAFFILIATED,
      metadata: JSON.stringify({ dentistId, branchId }),
    }));
  });
});
