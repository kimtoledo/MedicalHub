import { sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';

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
    },
    close: closeDatabase,
  };
}
