import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

dotenv.config();
process.env.DRIZZLE_MIGRATION = 'true';

type Journal = {
  entries: Array<{
    idx: number;
    tag: string;
    when: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

async function main(): Promise<void> {
  const source = join(process.cwd(), 'packages/db/migrations');
  const journalPath = join(source, 'meta/_journal.json');
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as Journal;
  let previousTimestamp = -1;
  const correctedTags: string[] = [];

  for (const entry of journal.entries) {
    if (entry.when <= previousTimestamp) {
      entry.when = previousTimestamp + 1;
      correctedTags.push(entry.tag);
    }
    previousTimestamp = entry.when;
  }

  if (correctedTags.length === 0) {
    console.log('✅  Migration journal timestamps are already monotonic.');
    return;
  }

  const temporaryRoot = await mkdtemp(join(tmpdir(), 'dentra-migrations-'));
  const temporaryMigrations = join(temporaryRoot, 'migrations');

  try {
    await cp(source, temporaryMigrations, { recursive: true });
    await writeFile(
      join(temporaryMigrations, 'meta/_journal.json'),
      `${JSON.stringify(journal, null, 2)}\n`,
      'utf8',
    );

    const { closeDatabase, db } = await import('@dentra/db');
    try {
      await migrate(db, { migrationsFolder: temporaryMigrations });
    } finally {
      await closeDatabase();
    }

    console.log(
      `✅  Reconciled ${correctedTags.length} skipped migrations through Drizzle: ${correctedTags[0]}–${correctedTags.at(-1)}`,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

void main();
