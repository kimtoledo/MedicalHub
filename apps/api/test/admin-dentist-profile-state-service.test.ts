import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { AuditAction } from '@dentra/shared';
import { createAdminDentistProfileStateService } from '../src/admin/dentists-service.js';

const actor = { id: 'admin-id', email: 'admin@dentra.ph' };

function createDatabaseDouble(current: { status?: string; verificationStatus?: string; publicationStatus?: string }, updated: object) {
  const select = vi.fn(() => ({ from: () => ({ where: () => ({ limit: async () => [current] }) }) }));
  const returning = vi.fn(async () => [updated]);
  const set = vi.fn(() => ({ where: () => ({ returning }) }));
  const update = vi.fn(() => ({ set }));
  const auditValues = vi.fn(async () => undefined);
  const insert = vi.fn(() => ({ values: auditValues }));
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback({ select, update, insert }) } as unknown as DB;
  return { database, set, auditValues };
}

describe('createAdminDentistProfileStateService', () => {
  it('conditionally verifies and audits the previous and next state', async () => {
    const { database, set, auditValues } = createDatabaseDouble({ status: 'pending' }, { id: 'dentist-id', verificationStatus: 'verified' });
    const service = createAdminDentistProfileStateService(database);
    await service.updateVerification('dentist-id', 'verified', actor);
    expect(set).toHaveBeenCalledWith({ verificationStatus: 'verified' });
    expect(auditValues).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.DENTIST_VERIFIED,
      metadata: JSON.stringify({ previousStatus: 'pending', nextStatus: 'verified' }),
    }));
  });

  it('requires verification before publication', async () => {
    const { database, set, auditValues } = createDatabaseDouble(
      { publicationStatus: 'draft', verificationStatus: 'pending' },
      { id: 'dentist-id', publicationStatus: 'published' },
    );
    const service = createAdminDentistProfileStateService(database);
    await expect(service.updatePublication('dentist-id', 'published', actor)).rejects.toMatchObject({ code: 'VERIFICATION_REQUIRED' });
    expect(set).not.toHaveBeenCalled();
    expect(auditValues).not.toHaveBeenCalled();
  });

  it('publishes verified profiles and appends an audit event', async () => {
    const { database, set, auditValues } = createDatabaseDouble(
      { publicationStatus: 'draft', verificationStatus: 'verified' },
      { id: 'dentist-id', publicationStatus: 'published' },
    );
    const service = createAdminDentistProfileStateService(database);
    await service.updatePublication('dentist-id', 'published', actor);
    expect(set).toHaveBeenCalledWith({ publicationStatus: 'published' });
    expect(auditValues).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.DENTIST_PUBLISHED,
      metadata: JSON.stringify({ previousStatus: 'draft', nextStatus: 'published' }),
    }));
  });
});
