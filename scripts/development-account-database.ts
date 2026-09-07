import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../packages/db/src/schema';
import type { DevelopmentAccountStore } from './development-accounts';

type SeedTransaction = Parameters<
  Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]
>[0];

export function createDevelopmentAccountStore(
  database: SeedTransaction,
  now = new Date(),
): DevelopmentAccountStore {
  return {
    async upsertUsers(rows) {
      for (const row of rows) {
        await database.insert(schema.users).values({
          ...row, emailVerified: true, isActive: 'true',
        }).onConflictDoUpdate({
          target: schema.users.id,
          set: { ...row, emailVerified: true, isActive: 'true', deletedAt: null, updatedAt: now },
        });
      }
    },
    async upsertCredentials(rows) {
      for (const row of rows) {
        await database.insert(schema.accounts).values(row).onConflictDoUpdate({
          target: [schema.accounts.providerId, schema.accounts.accountId],
          set: { userId: row.userId, password: row.password, updatedAt: now },
        });
      }
    },
    async upsertMemberships(rows) {
      for (const row of rows) {
        await database.insert(schema.clinicMemberships).values({
          ...row, isActive: 'true',
        }).onConflictDoUpdate({
          target: schema.clinicMemberships.id,
          set: { ...row, isActive: 'true', updatedAt: now },
        });
      }
    },
  };
}