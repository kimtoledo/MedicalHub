import { hashPassword } from '@better-auth/utils/password';
import { drizzle } from 'drizzle-orm/postgres-js';
import dotenv from 'dotenv';
import postgres from 'postgres';
import * as schema from '../packages/db/src/schema';
import {
  DEVELOPMENT_ACCOUNT_EMAILS,
  readDevelopmentPasswords,
  seedDevelopmentAccounts,
} from './development-accounts';
import { createDevelopmentAccountStore } from './development-account-database';

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set in a git-ignored .env file or Replit Secrets before seeding.');
  }
  const passwords = readDevelopmentPasswords(process.env);
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql, { schema });
  try {
    await db.transaction(async (tx) => {
      const store = createDevelopmentAccountStore(tx);
      await seedDevelopmentAccounts(store, passwords, hashPassword);
    });
    console.log(`Seeded ${DEVELOPMENT_ACCOUNT_EMAILS.length} development login accounts.`);
    console.log('Passwords were read from environment variables and stored only as hashes.');
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seeding error';
  console.error(`Development account seed failed: ${message}`);
  process.exitCode = 1;
});