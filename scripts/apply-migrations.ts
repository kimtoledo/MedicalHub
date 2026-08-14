/**
 * Idempotent migration runner for Dentra.ph
 *
 * Replaces `drizzle-kit migrate` in CI and post-merge contexts.
 *
 * Why not drizzle-kit migrate?
 *   drizzle-kit migrate hangs silently when the __drizzle_migrations tracking
 *   table is out of sync with the actual DB state (e.g. after manual applies
 *   or cross-agent merges). It also requires all snapshot files to be present.
 *
 * What this script does instead:
 *   1. Reads every SQL file from packages/db/migrations/ in journal order.
 *   2. Computes the canonical drizzle hash (SHA-256 of LF-normalised content).
 *   3. Skips files whose hash is already recorded in drizzle.__drizzle_migrations.
 *   4. For pending files, executes each statement individually.
 *      "Already exists" errors (42P07, 42701, 42710, 42P06, 42P16) are silently
 *      skipped — they mean the object was created by a prior out-of-band apply.
 *   5. Records the hash in __drizzle_migrations so future runs skip the file.
 *   6. After all migrations, calls assertDatabaseSchemaReady() to verify the
 *      live schema matches every object listed in packages/db/src/readiness.ts.
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();
process.env.DRIZZLE_MIGRATION = 'true';

// ── helpers ──────────────────────────────────────────────────────────────────

function drizzleHash(filePath: string): string {
  const content = readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(content).digest('hex');
}

// PostgreSQL error codes that mean "object already exists" → safe to skip
const SKIP_CODES = new Set([
  '42P07', // duplicate_table
  '42701', // duplicate_column
  '42710', // duplicate_object (indexes, constraints, types)
  '42P06', // duplicate_schema
  '42P16', // invalid_table_definition (e.g. constraint already there)
]);

// ── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌  DATABASE_URL is not set. Add it to Replit Secrets.');
    process.exit(1);
  }

  const sql = postgres(dbUrl, { max: 1 });

  try {
    // Ensure the drizzle tracking schema and table exist
    await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await sql`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id        SERIAL PRIMARY KEY,
        hash      TEXT NOT NULL,
        created_at BIGINT
      )
    `;

    // Load applied hashes
    const rows = await sql`SELECT hash FROM drizzle.__drizzle_migrations`;
    const applied = new Set(rows.map((r: { hash: string }) => r.hash));
    console.log(`Tracking table: ${applied.size} migration(s) already applied.`);

    // Enumerate SQL files in sorted order (matches journal order)
    const migrationsDir = resolve('packages/db/migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let newCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const hash = drizzleHash(filePath);

      if (applied.has(hash)) {
        skippedCount++;
        continue;
      }

      process.stdout.write(`  → ${file} ... `);

      const rawSql = readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
      const statements = rawSql.split('--> statement-breakpoint');
      let anyApplied = false;

      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (!trimmed) continue;
        try {
          await sql.unsafe(trimmed);
          anyApplied = true;
        } catch (err: unknown) {
          const pgErr = err as { code?: string; message?: string };
          if (pgErr.code && SKIP_CODES.has(pgErr.code)) {
            // Object already exists from a prior out-of-band apply — fine.
          } else {
            // Unexpected error — surface it and abort.
            process.stdout.write('\n');
            console.error(`❌  Failed on statement in ${file}:`);
            console.error(`    PG error ${pgErr.code}: ${pgErr.message}`);
            throw err;
          }
        }
      }

      // Record as applied regardless of whether statements ran or were skipped
      // (they exist in DB either way).
      const createdAt = BigInt(Date.now());
      await sql`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${hash}, ${createdAt})
      `;

      process.stdout.write(anyApplied ? '✅ applied\n' : '⏭️  already existed\n');
      newCount++;
      applied.add(hash);
    }

    console.log(
      `\nMigrations: ${newCount} applied, ${skippedCount} already up-to-date.`,
    );
  } finally {
    await sql.end();
  }

  // Schema readiness check — verifies every required table/column is present.
  console.log('\nRunning schema readiness check...');
  const { assertDatabaseSchemaReady, db, closeDatabase } = await import('@dentra/db');
  try {
    await assertDatabaseSchemaReady(db);
  } finally {
    await closeDatabase();
  }
  console.log('✅  Schema readiness check passed.');
}

main().catch((err) => {
  console.error('\n❌  Migration failed:', err.message ?? err);
  process.exit(1);
});
