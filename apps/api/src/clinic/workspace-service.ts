import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { branches, clinics } from '@dentra/db/schema';

export type ClinicWorkspace = { clinic: { id: string; name: string }; branches: Array<{ id: string; name: string; isMain: boolean; city: string | null; province: string | null }> };
export type ClinicWorkspaceService = { get: (clinicId: string, allowedBranchIds: string[] | null) => Promise<ClinicWorkspace | null> };

export function createClinicWorkspaceService(database: DB): ClinicWorkspaceService {
  return { get: async (clinicId, allowedBranchIds) => {
    const [clinic] = await database.select({ id: clinics.id, name: clinics.name }).from(clinics).where(and(eq(clinics.id, clinicId), inArray(clinics.status, ['trial', 'active']), isNull(clinics.deletedAt))).limit(1);
    if (!clinic) return null;
    if (allowedBranchIds?.length === 0) return { clinic, branches: [] };
    const rows = await database.select({ id: branches.id, name: branches.name, isMain: branches.isMain, city: branches.city, province: branches.province }).from(branches).where(and(eq(branches.clinicId, clinicId), eq(branches.isActive, true), isNull(branches.deletedAt), allowedBranchIds ? inArray(branches.id, allowedBranchIds) : undefined)).orderBy(desc(branches.isMain), asc(branches.name));
    return { clinic, branches: rows };
  } };
}
