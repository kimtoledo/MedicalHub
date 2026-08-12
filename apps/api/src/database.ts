import { sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { assertDatabaseSchemaReady } from '@dentra/db/readiness';

export type DatabaseServices = {
  db: DB;
  check: () => Promise<void>;
  close: () => Promise<void>;
};

export async function createDatabaseServices(): Promise<DatabaseServices> {
  const { closeDatabase, db } = await import('@dentra/db');

  return {
    db,
    check: async () => {
      await db.execute(sql`select 1`);
      await assertDatabaseSchemaReady(db);
    },
    close: closeDatabase,
  };
}
