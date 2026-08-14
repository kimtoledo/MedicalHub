/**
 * backfill-branch-hours.ts — one-time backfill for the structured branch_hours table.
 *
 * Parses each branch's legacy free-text `operating_hours` JSON (the same
 * format `parseHours()` in apps/api/src/public/booking-service.ts has always
 * read) into one branch_hours row per weekday. Branches with no
 * operating_hours value get the same Mon–Sat 9am–5pm / Sunday-closed default
 * the app already falls back to, so behavior is unchanged for every branch.
 *
 * Idempotent: skips any branch that already has branch_hours rows, so it's
 * safe to re-run (e.g. after a new branch is created before this backfill
 * becomes unnecessary).
 *
 * The legacy operating_hours column is intentionally left in place (not
 * dropped) after this runs — it's no longer read by the app, but keeping it
 * avoids a destructive schema change until the new table has been verified
 * against production data.
 *
 * Usage: npx tsx scripts/backfill-branch-hours.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import dotenv from 'dotenv';
import postgres from 'postgres';
import * as schema from '../packages/db/src/schema';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set.');
  process.exit(1);
}

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function parsePart(part: string): number | null {
  const match = part.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = match[3]?.toLowerCase();
  if (minute > 59 || hour > (period ? 12 : 23) || hour < (period ? 1 : 0)) return null;
  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** Mirrors the label parsing in booking-service.ts's parseHours(), for one weekday label. */
function parseLabel(label: string | undefined, weekday: number): { opensAt: number | null; closesAt: number | null; isClosed: boolean } {
  if (!label) {
    // Legacy default: Mon-Sat 9-5, Sunday closed.
    return weekday === 0 ? { opensAt: null, closesAt: null, isClosed: true } : { opensAt: 9 * 60, closesAt: 17 * 60, isClosed: false };
  }
  if (/closed/i.test(label)) return { opensAt: null, closesAt: null, isClosed: true };
  const normalized = label.replace(/[–—]/g, '-').trim();
  const parts = normalized.split(/\s*-\s*/);
  if (parts.length !== 2) return { opensAt: null, closesAt: null, isClosed: true };
  const start = parsePart(parts[0]);
  const end = parsePart(parts[1]);
  if (start === null || end === null || end <= start) return { opensAt: null, closesAt: null, isClosed: true };
  return { opensAt: start, closesAt: end, isClosed: false };
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const branches = await db.select({ id: schema.branches.id, operatingHours: schema.branches.operatingHours }).from(schema.branches);
  const existing = await db.selectDistinct({ branchId: schema.branchHours.branchId }).from(schema.branchHours);
  const alreadyDone = new Set(existing.map((row) => row.branchId));

  let inserted = 0;
  for (const branch of branches) {
    if (alreadyDone.has(branch.id)) continue;
    let parsed: Record<string, unknown> = {};
    if (branch.operatingHours) {
      try { parsed = JSON.parse(branch.operatingHours) as Record<string, unknown>; } catch { parsed = {}; }
    }
    const rows = dayNames.map((day, weekday) => {
      const label = typeof parsed[day] === 'string' ? (parsed[day] as string) : undefined;
      const { opensAt, closesAt, isClosed } = parseLabel(label, weekday);
      return { branchId: branch.id, weekday, opensAt, closesAt, isClosed };
    });
    await db.insert(schema.branchHours).values(rows);
    inserted += rows.length;
  }

  console.log(`✅  Backfilled branch_hours for ${branches.length - alreadyDone.size} branch(es) (${inserted} rows). ${alreadyDone.size} branch(es) already had rows and were skipped.`);
  await client.end();
}

main().catch((error) => {
  console.error('❌  Backfill failed:', error);
  process.exit(1);
});
