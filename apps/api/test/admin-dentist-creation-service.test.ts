import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { AuditAction } from '@dentra/shared';
import {
  AdminDentistCreationError,
  createAdminDentistCreationService,
} from '../src/admin/dentists-service.js';

function createDatabaseDouble(options?: { duplicate?: boolean }) {
  const duplicateRows = options?.duplicate ? [{ id: 'existing-id' }] : [];
  const select = vi.fn(() => ({
    from: () => ({
      where: () => ({
        limit: async () => duplicateRows,
      }),
    }),
  }));

  const createdAt = new Date('2026-08-12T00:00:00.000Z');
  const dentistReturning = vi.fn(async () => [{
    id: 'dentist-id',
    firstName: 'Paolo',
    lastName: 'Santos',
    slug: 'dr-paolo-santos',
    licenseNumber: 'PRC2026123',
    specialty: 'Prosthodontics',
    verificationStatus: 'unverified',
    publicationStatus: 'draft',
    createdAt,
  }]);
  const dentistValues = vi.fn(() => ({ returning: dentistReturning }));
  const auditValues = vi.fn(async () => undefined);
  const insert = vi
    .fn()
    .mockImplementationOnce(() => ({ values: dentistValues }))
    .mockImplementationOnce(() => ({ values: auditValues }));
  const transaction = vi.fn(async (callback: (transaction: unknown) => unknown) =>
    callback({ select, insert }),
  );

  return {
    auditValues,
    dentistValues,
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
  firstName: 'Paolo',
  lastName: 'Santos',
  slug: 'dr-paolo-santos',
  licenseNumber: ' prc-2026-123 ',
  specialty: 'Prosthodontics',
};

describe('createAdminDentistCreationService', () => {
  it('creates an unverified private profile and appends an audit event', async () => {
    const { auditValues, dentistValues, database } = createDatabaseDouble();
    const service = createAdminDentistCreationService(database);

    const result = await service.create(input, actor);

    expect(dentistValues).toHaveBeenCalledWith({
      ...input,
      licenseNumber: 'PRC2026123',
      verificationStatus: 'unverified',
      publicationStatus: 'draft',
    });
    expect(auditValues).toHaveBeenCalledWith({
      actorId: actor.id,
      actorEmail: actor.email,
      entityType: 'dentist',
      entityId: 'dentist-id',
      action: AuditAction.DENTIST_CREATED,
      metadata: JSON.stringify({
        verificationStatus: 'unverified',
        publicationStatus: 'draft',
      }),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    expect(result).toMatchObject({
      id: 'dentist-id',
      verificationStatus: 'unverified',
      publicationStatus: 'draft',
    });
  });

  it('rejects an existing slug before writing profile or audit data', async () => {
    const { auditValues, dentistValues, database } = createDatabaseDouble({
      duplicate: true,
    });
    const service = createAdminDentistCreationService(database);

    await expect(service.create(input, actor)).rejects.toBeInstanceOf(
      AdminDentistCreationError,
    );
    expect(dentistValues).not.toHaveBeenCalled();
    expect(auditValues).not.toHaveBeenCalled();
  });
});
