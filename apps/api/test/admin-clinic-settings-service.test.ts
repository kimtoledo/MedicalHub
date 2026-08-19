import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { AuditAction } from '@dentra/shared';
import {
  AdminClinicSettingsError,
  createAdminClinicSettingsService,
} from '../src/admin/clinic-settings-service.js';

const actor = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@dentra.ph',
};

const lockingSelect = (rows: unknown[]) => ({
  from: () => ({
    where: () => ({
      limit: () => ({ for: async () => rows }),
    }),
  }),
});

const limitedSelect = (rows: unknown[]) => ({
  from: () => ({ where: () => ({ limit: async () => rows }) }),
});

const orderedSelect = (rows: unknown[]) => ({
  from: () => ({
    where: () => ({ orderBy: () => ({ limit: async () => rows }) }),
  }),
});

/**
 * A chainable stub that is ALSO thenable, used as the fallback for the
 * capacity-summary queries assignPackage/setLimitOverride run after their
 * main write (resolveLimit/countUsage, up to ~4 selects per metric across
 * all 7 CapacityMetric values) — resolving everything to "no rows" is
 * enough since these tests don't assert on the resulting warnings.
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

describe('createAdminClinicSettingsService', () => {
  it('closes the effective subscription, inserts its replacement, and audits the package change', async () => {
    const effectiveAt = new Date('2026-08-12T16:00:00.000Z');
    const select = vi.fn()
      .mockImplementationOnce(() => lockingSelect([{ id: 'clinic-id' }]))
      .mockImplementationOnce(() => limitedSelect([{ id: 'new-package' }]))
      .mockImplementationOnce(() => limitedSelect([]))
      .mockImplementationOnce(() => orderedSelect([{
        id: 'old-subscription',
        packageId: 'old-package',
        status: 'active',
      }]))
      // Post-write capacity-summary lookups (resolveLimit/countUsage across
      // all metrics) — see the `chainable` helper doc comment above.
      .mockImplementation(() => chainable([]));
    const updateSet = vi.fn(() => ({ where: async () => undefined }));
    const update = vi.fn(() => ({ set: updateSet }));
    const subscriptionValues = vi.fn(() => ({ returning: async () => [{
      id: 'new-subscription',
      clinicId: 'clinic-id',
      packageId: 'new-package',
      status: 'active',
      startsAt: effectiveAt,
      expiresAt: null,
    }] }));
    const auditValues = vi.fn(async () => undefined);
    const insert = vi.fn()
      .mockImplementationOnce(() => ({ values: subscriptionValues }))
      .mockImplementationOnce(() => ({ values: auditValues }));
    const database = {
      transaction: async (callback: (tx: unknown) => unknown) =>
        callback({ select, update, insert }),
    } as unknown as DB;

    await createAdminClinicSettingsService(database).assignPackage(
      'clinic-id',
      { packageId: 'new-package', effectiveAt },
      actor,
    );

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: effectiveAt }),
    );
    expect(subscriptionValues).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-id',
        packageId: 'new-package',
        startsAt: effectiveAt,
      }),
    );
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.SUBSCRIPTION_CHANGED,
        metadata: JSON.stringify({
          previousPackageId: 'old-package',
          nextPackageId: 'new-package',
          effectiveAt: effectiveAt.toISOString(),
        }),
      }),
    );
  });

  it('rejects assignment when another future change exists', async () => {
    const select = vi.fn()
      .mockImplementationOnce(() => lockingSelect([{ id: 'clinic-id' }]))
      .mockImplementationOnce(() => limitedSelect([{ id: 'new-package' }]))
      .mockImplementationOnce(() => limitedSelect([{ id: 'future-subscription' }]));
    const insert = vi.fn();
    const database = {
      transaction: async (callback: (tx: unknown) => unknown) =>
        callback({ select, insert }),
    } as unknown as DB;

    await expect(
      createAdminClinicSettingsService(database).assignPackage(
        'clinic-id',
        { packageId: 'new-package', effectiveAt: new Date('2030-01-01T00:00:00Z') },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'FUTURE_ASSIGNMENT_EXISTS' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('expires the previous override, inserts the replacement, and audits it', async () => {
    const select = vi.fn(() => lockingSelect([{ id: 'clinic-id' }]));
    const updateSet = vi.fn(() => ({ where: async () => undefined }));
    const update = vi.fn(() => ({ set: updateSet }));
    const overrideValues = vi.fn(() => ({ returning: async () => [{
      id: 'override-id',
      featureKey: 'reports.advanced',
      isEnabled: true,
      reason: 'Pilot access',
      expiresAt: null,
      createdAt: new Date(),
    }] }));
    const auditValues = vi.fn(async () => undefined);
    const insert = vi.fn()
      .mockImplementationOnce(() => ({ values: overrideValues }))
      .mockImplementationOnce(() => ({ values: auditValues }));
    const database = {
      transaction: async (callback: (tx: unknown) => unknown) =>
        callback({ select, update, insert }),
    } as unknown as DB;

    await createAdminClinicSettingsService(database).setFeatureOverride(
      'clinic-id',
      {
        featureKey: 'reports.advanced',
        isEnabled: true,
        reason: 'Pilot access',
        expiresAt: null,
      },
      actor,
    );

    expect(updateSet).toHaveBeenCalledWith({ expiresAt: expect.any(Date) });
    expect(overrideValues).toHaveBeenCalledWith(
      expect.objectContaining({ featureKey: 'reports.advanced', grantedBy: actor.id }),
    );
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.FEATURE_OVERRIDE_SET }),
    );
  });

  it('expires an active override for the route clinic and audits its removal', async () => {
    const select = vi.fn()
      .mockImplementationOnce(() => lockingSelect([{ id: 'clinic-id' }]))
      .mockImplementationOnce(() => limitedSelect([{
        id: 'override-id',
        featureKey: 'reports.advanced',
      }]));
    const updateSet = vi.fn(() => ({ where: async () => undefined }));
    const update = vi.fn(() => ({ set: updateSet }));
    const auditValues = vi.fn(async () => undefined);
    const insert = vi.fn(() => ({ values: auditValues }));
    const database = {
      transaction: async (callback: (tx: unknown) => unknown) =>
        callback({ select, update, insert }),
    } as unknown as DB;

    await createAdminClinicSettingsService(database).removeFeatureOverride(
      'clinic-id',
      'override-id',
      actor,
    );

    expect(updateSet).toHaveBeenCalledWith({ expiresAt: expect.any(Date) });
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.FEATURE_OVERRIDE_REMOVED,
        metadata: JSON.stringify({ featureKey: 'reports.advanced' }),
      }),
    );
  });

  it('requires the microsite entitlement before publishing', async () => {
    const select = vi.fn()
      .mockImplementationOnce(() => lockingSelect([{
        id: 'clinic-id',
        status: 'active',
        publicationStatus: 'draft',
      }]))
      .mockImplementationOnce(() => orderedSelect([{ packageId: 'starter' }]))
      .mockImplementationOnce(() => limitedSelect([]))
      .mockImplementationOnce(() => orderedSelect([]));
    const update = vi.fn();
    const database = {
      transaction: async (callback: (tx: unknown) => unknown) =>
        callback({ select, update }),
    } as unknown as DB;

    await expect(
      createAdminClinicSettingsService(database).updatePublication(
        'clinic-id',
        'published',
        actor,
      ),
    ).rejects.toBeInstanceOf(AdminClinicSettingsError);
    expect(update).not.toHaveBeenCalled();
  });

  it('publishes an entitled operational clinic and audits the transition', async () => {
    const select = vi.fn()
      .mockImplementationOnce(() => lockingSelect([{
        id: 'clinic-id',
        status: 'active',
        publicationStatus: 'unpublished',
      }]))
      .mockImplementationOnce(() => orderedSelect([{ packageId: 'pro' }]))
      .mockImplementationOnce(() => limitedSelect([{ isEnabled: true }]))
      .mockImplementationOnce(() => orderedSelect([]));
    const updateReturning = vi.fn(async () => [{
      id: 'clinic-id',
      publicationStatus: 'published',
      updatedAt: new Date(),
    }]);
    const update = vi.fn(() => ({
      set: () => ({ where: () => ({ returning: updateReturning }) }),
    }));
    const auditValues = vi.fn(async () => undefined);
    const insert = vi.fn(() => ({ values: auditValues }));
    const database = {
      transaction: async (callback: (tx: unknown) => unknown) =>
        callback({ select, update, insert }),
    } as unknown as DB;

    await createAdminClinicSettingsService(database).updatePublication(
      'clinic-id',
      'published',
      actor,
    );

    expect(updateReturning).toHaveBeenCalled();
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.CLINIC_PUBLISHED,
        metadata: JSON.stringify({
          previousStatus: 'unpublished',
          nextStatus: 'published',
        }),
      }),
    );
  });

  it('allows unpublishing without an entitlement lookup', async () => {
    const select = vi.fn()
      .mockImplementationOnce(() => lockingSelect([{
        id: 'clinic-id',
        status: 'suspended',
        publicationStatus: 'published',
      }]));
    const update = vi.fn(() => ({
      set: () => ({
        where: () => ({ returning: async () => [{
          id: 'clinic-id',
          publicationStatus: 'unpublished',
          updatedAt: new Date(),
        }] }),
      }),
    }));
    const auditValues = vi.fn(async () => undefined);
    const insert = vi.fn(() => ({ values: auditValues }));
    const database = {
      transaction: async (callback: (tx: unknown) => unknown) =>
        callback({ select, update, insert }),
    } as unknown as DB;

    await createAdminClinicSettingsService(database).updatePublication(
      'clinic-id',
      'unpublished',
      actor,
    );

    expect(select).toHaveBeenCalledTimes(1);
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.CLINIC_UNPUBLISHED }),
    );
  });
});
