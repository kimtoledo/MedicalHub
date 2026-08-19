import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { AuditAction } from '@dentra/shared';
import { createAdminDentistAffiliationService } from '../src/admin/dentists-service.js';

const actor = { id: 'admin-id', email: 'admin@dentra.ph', ipAddress: '127.0.0.1', userAgent: 'test' };
const dentistId = 'dentist-id';
const branchId = 'branch-id';
const clinicId = 'clinic-id';
const affiliationId = 'affiliation-id';

/**
 * A chainable stub that is ALSO thenable, so it works both as an
 * intermediate link (`.from().innerJoin().where().orderBy()`) and as the
 * terminal awaited call (`await select(...).limit(1)` or
 * `.limit(1).for('update')`), regardless of exactly how many chain methods
 * the real query builds.
 */
function chainable(value: unknown): any {
  const obj: any = {
    from: () => obj,
    innerJoin: () => obj,
    where: () => obj,
    orderBy: () => obj,
    limit: () => obj,
    for: () => Promise.resolve(value),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(value).then(resolve, reject),
  };
  return obj;
}

function selectable(rows: unknown[]) {
  return chainable(rows);
}

describe('createAdminDentistAffiliationService', () => {
  it('derives clinic scope from the branch and audits affiliation creation', async () => {
    // Call order in add(): 1) dentist lookup, 2) branch+clinic lookup,
    // 3) clinic row lock, 4) exact (dentistId,branchId) duplicate check,
    // 5) "already affiliated with this clinic" check (empty = fresh dentist,
    // so the capacity check below actually runs), 6) capacity override
    // lookup (unlimited, so assertClinicCapacity short-circuits before ever
    // querying usage).
    const select = vi.fn()
      .mockImplementationOnce(() => selectable([{ id: dentistId }]))
      .mockImplementationOnce(() => selectable([{ branchId, clinicId }]))
      .mockImplementationOnce(() => selectable([{ id: clinicId }]))
      .mockImplementationOnce(() => selectable([]))
      .mockImplementationOnce(() => selectable([]))
      .mockImplementationOnce(() => selectable([{ limit: null }]));
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

  it('rejects a new affiliation with DENTIST_LIMIT_REACHED when the clinic is at its dentist cap', async () => {
    const select = vi.fn()
      .mockImplementationOnce(() => selectable([{ id: dentistId }]))       // dentist lookup
      .mockImplementationOnce(() => selectable([{ branchId, clinicId }]))  // branch+clinic lookup
      .mockImplementationOnce(() => selectable([{ id: clinicId }]))        // clinic lock
      .mockImplementationOnce(() => selectable([]))                       // no exact (dentistId,branchId) duplicate
      .mockImplementationOnce(() => selectable([]))                       // not already affiliated with this clinic
      .mockImplementationOnce(() => selectable([{ limit: 1 }]))           // capacity override: limit 1
      .mockImplementationOnce(() => selectable([{ value: 1 }]));          // live usage: already 1
    const affiliationValues = vi.fn();
    const auditValues = vi.fn();
    const insert = vi.fn().mockImplementationOnce(() => ({ values: affiliationValues }));
    const database = { transaction: async (callback: (tx: unknown) => unknown) => callback({ select, insert }) } as unknown as DB;

    const service = createAdminDentistAffiliationService(database);
    const error = await service.add(dentistId, branchId, actor).catch((e) => e);

    expect(error).toMatchObject({ code: 'DENTIST_LIMIT_REACHED' });
    expect(affiliationValues).not.toHaveBeenCalled();
    expect(auditValues).not.toHaveBeenCalled();
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
