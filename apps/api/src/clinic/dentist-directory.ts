import { and, asc, eq, isNull } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { dentistBranchAssignments, dentists } from '@dentra/db/schema';

export type ClinicDentistOption = { id: string; firstName: string; lastName: string; branchIds: string[] };

export async function listClinicDentists(database: DB, clinicId: string): Promise<ClinicDentistOption[]> {
  const rows = await database
    .select({ id: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName, branchId: dentistBranchAssignments.branchId })
    .from(dentistBranchAssignments)
    .innerJoin(dentists, eq(dentistBranchAssignments.dentistId, dentists.id))
    .where(and(eq(dentistBranchAssignments.clinicId, clinicId), eq(dentistBranchAssignments.isActive, 'true'), isNull(dentists.deletedAt)))
    .orderBy(asc(dentists.lastName), asc(dentists.firstName));
  const map = new Map<string, ClinicDentistOption>();
  for (const row of rows) {
    const entry = map.get(row.id) ?? { id: row.id, firstName: row.firstName, lastName: row.lastName, branchIds: [] };
    entry.branchIds.push(row.branchId);
    map.set(row.id, entry);
  }
  return Array.from(map.values());
}

/** Confirms `dentistId` is an actively-assigned dentist within this clinic, to guard admin-supplied attribution. */
export async function isActiveClinicDentist(database: DB, clinicId: string, dentistId: string): Promise<boolean> {
  const [row] = await database
    .select({ id: dentistBranchAssignments.id })
    .from(dentistBranchAssignments)
    .where(and(eq(dentistBranchAssignments.clinicId, clinicId), eq(dentistBranchAssignments.dentistId, dentistId), eq(dentistBranchAssignments.isActive, 'true')))
    .limit(1);
  return Boolean(row);
}
