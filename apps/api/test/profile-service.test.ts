import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { createAccountProfileService } from '../src/profile/service.js';

vi.mock('@dentra/db/audit', () => ({ writeAudit: vi.fn(async () => undefined) }));

function queryResult<T>(result: T) {
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'limit', 'for', 'innerJoin', 'leftJoin', 'orderBy', 'set']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: T) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

function databaseWith(current: { firstName: string; lastName: string; phone: string | null; avatarUrl: string | null }) {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    firstName: 'Alex',
    lastName: 'Santos',
    name: 'Alex Santos',
    email: 'staff@example.test',
    phone: null,
    avatarUrl: null,
    emailVerified: true,
  };
  const memberships = [{
    clinicId: '22222222-2222-4222-8222-222222222222',
    clinicName: 'Dentra Test Clinic',
    branchId: null,
    branchName: null,
    role: 'receptionist' as const,
  }];
  const results = [[current], [user], memberships];
  let index = 0;
  const database = {
    select: vi.fn(() => queryResult(results[index++])),
    update: vi.fn(() => queryResult([])),
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(database)),
  };
  return database;
}

describe('account profile service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('audits changed field names without recording their values', async () => {
    const database = databaseWith({
      firstName: 'Jamie',
      lastName: 'Santos',
      phone: '+63 917 000 0000',
      avatarUrl: null,
    });
    const service = createAccountProfileService(database as unknown as DB);

    const result = await service.update(
      '11111111-1111-4111-8111-111111111111',
      { firstName: 'Alex', lastName: 'Santos', phone: null, avatarUrl: null },
      {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'staff@example.test',
        clinicId: '22222222-2222-4222-8222-222222222222',
      },
    );

    expect(result.user.name).toBe('Alex Santos');
    expect(database.update).toHaveBeenCalledOnce();
    expect(writeAudit).toHaveBeenCalledOnce();
    const audit = vi.mocked(writeAudit).mock.calls[0]?.[1];
    if (!audit || Array.isArray(audit)) throw new Error('Expected one audit event');
    expect(audit).toMatchObject({
      actorId: '11111111-1111-4111-8111-111111111111',
      clinicId: '22222222-2222-4222-8222-222222222222',
      entityType: 'user_profile',
      entityId: '11111111-1111-4111-8111-111111111111',
      action: 'account.profile_updated',
    });
    expect(audit?.metadata).toBe(JSON.stringify({ fields: ['firstName', 'phone'] }));
    expect(audit?.metadata).not.toContain('Alex');
    expect(audit?.metadata).not.toContain('+63');
  });
});
