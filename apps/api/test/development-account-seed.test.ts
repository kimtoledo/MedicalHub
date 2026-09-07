import { hashPassword, verifyPassword } from '@better-auth/utils/password';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { describe, expect, it, vi } from 'vitest';
import * as schema from '../../../packages/db/src/schema';
import { createDevelopmentAccountStore } from '../../../scripts/development-account-database';
import {
  DEVELOPMENT_ACCOUNT_EMAILS,
  readDevelopmentPasswords,
  seedDevelopmentAccounts,
  type DevelopmentAccountStore,
  type DevelopmentCredential,
  type DevelopmentMembership,
  type DevelopmentUser,
} from '../../../scripts/development-accounts';

function memoryStore() {
  const users = new Map<string, DevelopmentUser>();
  const credentials = new Map<string, DevelopmentCredential>();
  const memberships = new Map<string, DevelopmentMembership>();
  const store: DevelopmentAccountStore = {
    async upsertUsers(rows) { rows.forEach((row) => users.set(row.id, row)); },
    async upsertCredentials(rows) { rows.forEach((row) => credentials.set(`${row.providerId}:${row.accountId}`, row)); },
    async upsertMemberships(rows) { rows.forEach((row) => memberships.set(row.id, row)); },
  };
  return { store, users, credentials, memberships };
}

describe('development account seed', () => {
  it('rejects missing or policy-incompatible credentials before writes', () => {
    expect(() => readDevelopmentPasswords({})).toThrow(/DEV_SUPER_ADMIN_PASSWORD.*DEV_CLINIC_PASSWORD.*at least 10/);
    expect(() => readDevelopmentPasswords({
      DEV_SUPER_ADMIN_PASSWORD: 'short',
      DEV_CLINIC_PASSWORD: 'long-enough',
    })).toThrow(/DEV_SUPER_ADMIN_PASSWORD/);
  });

  it('stores hashes, preserves role links, and remains repeatable', async () => {
    const state = memoryStore();
    const hash = vi.fn(async (password: string) => `hashed:${password.length}`);
    const passwords = { superAdmin: 'admin-password', clinicStaff: 'clinic-password' };

    await seedDevelopmentAccounts(state.store, passwords, hash);
    await seedDevelopmentAccounts(state.store, passwords, hash);

    expect(state.users).toHaveLength(8);
    expect(state.credentials).toHaveLength(8);
    expect(state.memberships).toHaveLength(7);
    expect([...state.credentials.values()].every((row) =>
      row.password.startsWith('hashed:') &&
      row.password !== passwords.superAdmin &&
      row.password !== passwords.clinicStaff,
    )).toBe(true);
    expect([...state.users.values()].find((row) => row.email === 'admin@dentra.ph')?.platformRole).toBe('super_admin');
    expect([...state.memberships.values()].find((row) => row.role === 'dentist')).toMatchObject({
      dentistId: '00000000-0005-0000-0000-000000000001',
      clinicId: '00000000-0003-0000-0000-000000000001',
    });
  });

  it('is repeatable against PostgreSQL unique and foreign-key constraints', async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for the development account integration test.');
    }
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });
    const db = drizzle(sql, { schema });
    const passwords = { superAdmin: 'integration-admin-password', clinicStaff: 'integration-clinic-password' };

    try {
      await expect(db.transaction(async (tx) => {
        await tx.insert(schema.clinics).values([
          { id: '00000000-0003-0000-0000-000000000001', name: 'Smile Bright Dental', slug: 'smile-bright-dental', prefix: 'SBD', status: 'active' },
          { id: '00000000-0003-0000-0000-000000000002', name: 'BrightSmile Dental Clinic', slug: 'brightsmile-dental-clinic', prefix: 'BSM', status: 'trial' },
        ]).onConflictDoNothing();
        await tx.insert(schema.branches).values([
          { id: '00000000-0004-0000-0000-000000000001', clinicId: '00000000-0003-0000-0000-000000000001', name: 'Katipunan Main', isMain: true },
          { id: '00000000-0004-0000-0000-000000000003', clinicId: '00000000-0003-0000-0000-000000000002', name: 'Ayala Main', isMain: true },
        ]).onConflictDoNothing();
        await tx.insert(schema.dentists).values({
          id: '00000000-0005-0000-0000-000000000001',
          slug: 'dr-maria-reyes',
          firstName: 'Maria',
          lastName: 'Reyes',
          licenseNumber: 'PRC-DEN-2015-001234',
        }).onConflictDoNothing();

        const store = createDevelopmentAccountStore(tx);
        await seedDevelopmentAccounts(store, passwords, hashPassword);
        await seedDevelopmentAccounts(store, passwords, hashPassword);

        const seededUsers = await tx.select().from(schema.users)
          .where(inArray(schema.users.email, [...DEVELOPMENT_ACCOUNT_EMAILS]));
        const userIds = seededUsers.map((user) => user.id);
        const credentials = await tx.select().from(schema.accounts).where(and(
          eq(schema.accounts.providerId, 'credential'),
          inArray(schema.accounts.userId, userIds),
        ));
        const seededMemberships = await tx.select().from(schema.clinicMemberships)
          .where(inArray(schema.clinicMemberships.userId, userIds));

        expect(seededUsers).toHaveLength(8);
        expect(credentials).toHaveLength(8);
        expect(seededMemberships).toHaveLength(7);
        expect(credentials.every((row) =>
          row.password !== passwords.superAdmin && row.password !== passwords.clinicStaff,
        )).toBe(true);
        const adminCredential = credentials.find((row) =>
          row.userId === '00000000-0001-0000-0000-000000000001');
        expect(await verifyPassword(
          adminCredential?.password ?? '',
          passwords.superAdmin,
        )).toBe(true);
        expect(seededMemberships.find((row) => row.role === 'dentist')).toMatchObject({
          dentistId: '00000000-0005-0000-0000-000000000001',
          clinicId: '00000000-0003-0000-0000-000000000001',
        });

        tx.rollback();
      })).rejects.toBeDefined();
    } finally {
      await sql.end();
    }
  }, 30_000);
});