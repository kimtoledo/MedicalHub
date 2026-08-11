import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add it to your .env file (local) or Replit Secrets (production).',
  );
}

/**
 * Postgres.js connection.
 * For migrations (drizzle-kit), max: 1 to avoid hanging connections.
 * For the application server, increase max as needed.
 */
const isMigration = process.env.DRIZZLE_MIGRATION === 'true';

const client = postgres(process.env.DATABASE_URL, {
  max: isMigration ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;

export async function closeDatabase(): Promise<void> {
  await client.end({ timeout: 5 });
}

// Export schema for use in queries
export { schema };
