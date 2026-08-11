import { and, count, countDistinct, desc, eq, exists, ilike, inArray, isNull, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { branches, clinics, dentistBranchAssignments, dentists, services } from '@dentra/db/schema';

export type PublicListInput = { search: string; page: number; pageSize: number };
export type PublicClinicListInput = PublicListInput & { location: string; service: string };
export type PublicDentistListInput = PublicListInput & { specialty: string };
export type PublicDirectoryService = {
  listClinics: (input: PublicClinicListInput) => Promise<{ items: Array<{ id: string; name: string; slug: string; description: string | null; logoUrl: string | null; city: string | null; province: string | null; locations: string[]; services: string[] }>; pagination: Pagination }>;
  listDentists: (input: PublicDentistListInput) => Promise<{ items: Array<{ id: string; firstName: string; lastName: string; slug: string; specialty: string | null; bio: string | null; photoUrl: string | null; affiliatedClinicCount: number }>; pagination: Pagination }>;
  summary: () => Promise<{ publishedClinicCount: number; publishedDentistCount: number }>;
};
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
const publicClinic = and(eq(clinics.publicationStatus, 'published'), inArray(clinics.status, ['trial', 'active']), isNull(clinics.deletedAt));
const publicDentist = and(eq(dentists.publicationStatus, 'published'), eq(dentists.verificationStatus, 'verified'), isNull(dentists.deletedAt));

export function createPublicDirectoryService(database: DB): PublicDirectoryService {
  return {
    listClinics: async (input) => {
      const search = `%${input.search.trim()}%`; const location = `%${input.location.trim()}%`; const service = `%${input.service.trim()}%`;
      const where = and(publicClinic,
        input.search ? or(ilike(clinics.name, search), ilike(clinics.slug, search), ilike(clinics.description, search)) : undefined,
        input.location ? or(ilike(clinics.city, location), ilike(clinics.province, location), exists(database.select({ id: branches.id }).from(branches).where(and(eq(branches.clinicId, clinics.id), eq(branches.isActive, true), isNull(branches.deletedAt), or(ilike(branches.city, location), ilike(branches.province, location)))))) : undefined,
        input.service ? exists(database.select({ id: services.id }).from(services).where(and(eq(services.clinicId, clinics.id), eq(services.isActive, 'true'), ilike(services.name, service)))) : undefined,
      );
      const [totalRow] = await database.select({ total: count(clinics.id) }).from(clinics).where(where); const total = totalRow?.total ?? 0; const totalPages = Math.max(1, Math.ceil(total / input.pageSize)); const page = Math.min(input.page, totalPages);
      const rows = await database.select({ id: clinics.id, name: clinics.name, slug: clinics.slug, description: clinics.description, logoUrl: clinics.logoUrl, city: clinics.city, province: clinics.province }).from(clinics).where(where).orderBy(desc(clinics.createdAt), clinics.name).limit(input.pageSize).offset((page - 1) * input.pageSize);
      const ids = rows.map((row) => row.id);
      const [branchRows, serviceRows] = ids.length ? await Promise.all([
        database.select({ clinicId: branches.clinicId, city: branches.city, province: branches.province }).from(branches).where(and(inArray(branches.clinicId, ids), eq(branches.isActive, true), isNull(branches.deletedAt))),
        database.select({ clinicId: services.clinicId, name: services.name }).from(services).where(and(inArray(services.clinicId, ids), eq(services.isActive, 'true'))).orderBy(services.name),
      ]) : [[], []];
      return { items: rows.map((row) => ({ ...row, locations: [...new Set(branchRows.filter((branch) => branch.clinicId === row.id).map((branch) => [branch.city, branch.province].filter(Boolean).join(', ')).filter(Boolean))], services: serviceRows.filter((item) => item.clinicId === row.id).map((item) => item.name) })), pagination: { page, pageSize: input.pageSize, total, totalPages } };
    },
    listDentists: async (input) => {
      const search = `%${input.search.trim()}%`; const specialty = `%${input.specialty.trim()}%`;
      const where = and(publicDentist, input.search ? or(ilike(dentists.firstName, search), ilike(dentists.lastName, search), ilike(dentists.slug, search), ilike(dentists.specialty, search)) : undefined, input.specialty ? ilike(dentists.specialty, specialty) : undefined);
      const [totalRow] = await database.select({ total: count(dentists.id) }).from(dentists).where(where); const total = totalRow?.total ?? 0; const totalPages = Math.max(1, Math.ceil(total / input.pageSize)); const page = Math.min(input.page, totalPages);
      const rows = await database.select({ id: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName, slug: dentists.slug, specialty: dentists.specialty, bio: dentists.bio, photoUrl: dentists.photoUrl }).from(dentists).where(where).orderBy(dentists.lastName, dentists.firstName).limit(input.pageSize).offset((page - 1) * input.pageSize);
      const counts = rows.length ? await database.select({ dentistId: dentistBranchAssignments.dentistId, total: countDistinct(dentistBranchAssignments.clinicId) }).from(dentistBranchAssignments).innerJoin(clinics, eq(dentistBranchAssignments.clinicId, clinics.id)).where(and(inArray(dentistBranchAssignments.dentistId, rows.map((row) => row.id)), eq(dentistBranchAssignments.isActive, 'true'), publicClinic)).groupBy(dentistBranchAssignments.dentistId) : [];
      const map = new Map(counts.map((row) => [row.dentistId, row.total]));
      return { items: rows.map((row) => ({ ...row, affiliatedClinicCount: map.get(row.id) ?? 0 })), pagination: { page, pageSize: input.pageSize, total, totalPages } };
    },
    summary: async () => {
      const [clinicRows, dentistRows] = await Promise.all([database.select({ total: count(clinics.id) }).from(clinics).where(publicClinic), database.select({ total: count(dentists.id) }).from(dentists).where(publicDentist)]);
      return { publishedClinicCount: clinicRows[0]?.total ?? 0, publishedDentistCount: dentistRows[0]?.total ?? 0 };
    },
  };
}
