/**
 * seed-ph-holidays.ts — seeds clinic_closures with the Philippines' regular
 * and recurring special non-working holidays for the current and next
 * calendar year, one row per existing clinic, so every clinic starts with a
 * togglable holiday list instead of an empty one.
 *
 * Only fixed-date holidays are seeded here (movable ones like Chinese New
 * Year, Eid'l Fitr, Eid'l Adha, and National Heroes Day shift every year and
 * are announced by proclamation — add those manually via clinic settings, or
 * extend this script with a per-year override table before re-running).
 *
 * Idempotent: skips any (clinic, date) pair that already has a closure row,
 * so it's safe to re-run yearly to seed the next year's dates.
 *
 * Usage: npx tsx scripts/seed-ph-holidays.ts [year ...]
 *   Defaults to the current and next calendar year if no years are given.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import postgres from 'postgres';
import * as schema from '../packages/db/src/schema';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set.');
  process.exit(1);
}

// Fixed-date Philippine regular and special (non-working) holidays.
const FIXED_HOLIDAYS: Array<{ month: number; day: number; label: string }> = [
  { month: 1, day: 1, label: "New Year's Day" },
  { month: 4, day: 9, label: 'Araw ng Kagitingan' },
  { month: 5, day: 1, label: 'Labor Day' },
  { month: 6, day: 12, label: 'Independence Day' },
  { month: 8, day: 21, label: 'Ninoy Aquino Day' },
  { month: 11, day: 1, label: "All Saints' Day" },
  { month: 11, day: 30, label: 'Bonifacio Day' },
  { month: 12, day: 8, label: 'Feast of the Immaculate Conception' },
  { month: 12, day: 24, label: 'Christmas Eve' },
  { month: 12, day: 25, label: 'Christmas Day' },
  { month: 12, day: 30, label: 'Rizal Day' },
  { month: 12, day: 31, label: "New Year's Eve" },
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const years = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n));
  const targetYears = years.length ? years : [new Date().getUTCFullYear(), new Date().getUTCFullYear() + 1];

  const clinics = await db.select({ id: schema.clinics.id }).from(schema.clinics);
  const existing = await db
    .select({ clinicId: schema.clinicClosures.clinicId, date: schema.clinicClosures.date })
    .from(schema.clinicClosures)
    .where(eq(schema.clinicClosures.source, 'ph_holiday'));
  const existingKeys = new Set(existing.map((row) => `${row.clinicId}:${row.date}`));

  const rows: (typeof schema.clinicClosures.$inferInsert)[] = [];
  for (const clinic of clinics) {
    for (const year of targetYears) {
      for (const holiday of FIXED_HOLIDAYS) {
        const date = `${year}-${pad(holiday.month)}-${pad(holiday.day)}`;
        const key = `${clinic.id}:${date}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        rows.push({ clinicId: clinic.id, branchId: null, date, label: holiday.label, source: 'ph_holiday', isEnabled: true });
      }
    }
  }

  if (rows.length) await db.insert(schema.clinicClosures).values(rows);
  console.log(`✅  Seeded ${rows.length} PH holiday closure row(s) across ${clinics.length} clinic(s) for year(s) ${targetYears.join(', ')}.`);
  await client.end();
}

main().catch((error) => {
  console.error('❌  Seeding failed:', error);
  process.exit(1);
});
