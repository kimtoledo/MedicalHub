import { and, count, countDistinct, desc, eq, exists, ilike, inArray, isNull, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { branches, clinicGalleryItems, clinics, dentistBranchAssignments, dentists, services } from '@dentra/db/schema';

export type PublicListInput = { search: string; page: number; pageSize: number };
export type PublicClinicListInput = PublicListInput & { location: string; service: string };
export type PublicDentistListInput = PublicListInput & { specialty: string };
export type PublicDirectoryService = {
  listClinics: (input: PublicClinicListInput) => Promise<{ items: Array<{ id: string; name: string; slug: string; description: string | null; logoUrl: string | null; city: string | null; province: string | null; locations: string[]; services: string[] }>; pagination: Pagination }>;
  listDentists: (input: PublicDentistListInput) => Promise<{ items: Array<{ id: string; firstName: string; lastName: string; slug: string; specialty: string | null; bio: string | null; photoUrl: string | null; affiliatedClinicCount: number }>; pagination: Pagination }>;
  summary: () => Promise<{ publishedClinicCount: number; publishedDentistCount: number }>;
  getClinicBySlug: (slug: string) => Promise<PublicClinicDetail | null>;
  getDentistBySlug: (slug: string) => Promise<PublicDentistDetail | null>;
};
export type PublicClinicDetail = {
  id: string; name: string; slug: string; heroText: string | null; description: string | null;
  logoUrl: string | null; coverUrl: string | null; email: string | null; phone: string | null;
  website: string | null; address: string | null; city: string | null; province: string | null;
  mapUrl: string | null; facebookUrl: string | null; instagramUrl: string | null;
  themePreset?: string; brandAccent?: string; showGallery?: boolean; showTeam?: boolean; showServices?: boolean; seoTitle?: string | null; seoDescription?: string | null; ogImageUrl?: string | null;
  gallery?: Array<{ id: string; imageUrl: string; altText: string; caption: string | null }>;
  branches: Array<{ id: string; name: string; phone: string | null; email: string | null; address: string | null; city: string | null; province: string | null; mapUrl: string | null; operatingHours: Record<string, string> }>;
  services: Array<{ id: string; name: string; description: string | null; durationMinutes: string }>;
  dentists: Array<{ id: string; firstName: string; lastName: string; slug: string; specialty: string | null; photoUrl: string | null; branches: string[]; branchIds: string[] }>;
};
export type PublicDentistDetail = {
  id: string; firstName: string; lastName: string; slug: string; specialty: string | null;
  bio: string | null; photoUrl: string | null; licenseNumber: string | null;
  affiliations: Array<{ assignmentId: string; clinicId: string; clinicName: string; clinicSlug: string; clinicLogoUrl: string | null; branchId: string; branchName: string; address: string | null; city: string | null; province: string | null; services: string[] }>;
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
        input.service ? exists(database.select({ id: services.id }).from(services).where(and(eq(services.clinicId, clinics.id), eq(services.isActive, 'true'), eq(services.isBookable, true), ilike(services.name, service)))) : undefined,
      );
      const [totalRow] = await database.select({ total: count(clinics.id) }).from(clinics).where(where); const total = totalRow?.total ?? 0; const totalPages = Math.max(1, Math.ceil(total / input.pageSize)); const page = Math.min(input.page, totalPages);
      const rows = await database.select({ id: clinics.id, name: clinics.name, slug: clinics.slug, description: clinics.description, logoUrl: clinics.logoUrl, city: clinics.city, province: clinics.province }).from(clinics).where(where).orderBy(desc(clinics.createdAt), clinics.name).limit(input.pageSize).offset((page - 1) * input.pageSize);
      const ids = rows.map((row) => row.id);
      const [branchRows, serviceRows] = ids.length ? await Promise.all([
        database.select({ clinicId: branches.clinicId, city: branches.city, province: branches.province }).from(branches).where(and(inArray(branches.clinicId, ids), eq(branches.isActive, true), isNull(branches.deletedAt))),
        database.select({ clinicId: services.clinicId, name: services.name }).from(services).where(and(inArray(services.clinicId, ids), eq(services.isActive, 'true'), eq(services.isBookable, true))).orderBy(services.name),
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
    getClinicBySlug: async (slug) => {
      const [clinic] = await database.select({
        id: clinics.id, name: clinics.name, slug: clinics.slug, heroText: clinics.heroText,
        description: clinics.description, logoUrl: clinics.logoUrl, coverUrl: clinics.coverUrl,
        email: clinics.email, phone: clinics.phone, website: clinics.website, address: clinics.address,
        city: clinics.city, province: clinics.province, mapUrl: clinics.mapUrl,
        facebookUrl: clinics.facebookUrl, instagramUrl: clinics.instagramUrl, themePreset: clinics.themePreset, brandAccent: clinics.brandAccent, showGallery: clinics.showGallery, showTeam: clinics.showTeam, showServices: clinics.showServices, seoTitle: clinics.seoTitle, seoDescription: clinics.seoDescription, ogImageUrl: clinics.ogImageUrl,
      }).from(clinics).where(and(eq(clinics.slug, slug), publicClinic)).limit(1);
      if (!clinic) return null;
      const [branchRows, serviceRows, dentistRows, galleryRows] = await Promise.all([
        database.select({ id: branches.id, name: branches.name, phone: branches.phone, email: branches.email, address: branches.address, city: branches.city, province: branches.province, mapUrl: branches.mapUrl, operatingHours: branches.operatingHours }).from(branches).where(and(eq(branches.clinicId, clinic.id), eq(branches.isActive, true), isNull(branches.deletedAt))).orderBy(desc(branches.isMain), branches.name),
        database.select({ id: services.id, name: services.name, description: services.description, durationMinutes: services.durationMinutes }).from(services).where(and(eq(services.clinicId, clinic.id), eq(services.isActive, 'true'), eq(services.isBookable, true))).orderBy(services.name),
        database.select({ id: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName, slug: dentists.slug, specialty: dentists.specialty, photoUrl: dentists.photoUrl, branchId: branches.id, branchName: branches.name }).from(dentistBranchAssignments).innerJoin(dentists, eq(dentistBranchAssignments.dentistId, dentists.id)).innerJoin(branches, eq(dentistBranchAssignments.branchId, branches.id)).where(and(eq(dentistBranchAssignments.clinicId, clinic.id), eq(dentistBranchAssignments.isActive, 'true'), eq(branches.isActive, true), isNull(branches.deletedAt), publicDentist)).orderBy(dentists.lastName, dentists.firstName, branches.name),
        database.select({ id: clinicGalleryItems.id, imageUrl: clinicGalleryItems.imageUrl, altText: clinicGalleryItems.altText, caption: clinicGalleryItems.caption }).from(clinicGalleryItems).where(and(eq(clinicGalleryItems.clinicId, clinic.id), eq(clinicGalleryItems.isPublished, true))).orderBy(clinicGalleryItems.sortOrder),
      ]);
      const dentistMap = new Map<string, PublicClinicDetail['dentists'][number]>();
      dentistRows.forEach((row) => { const current = dentistMap.get(row.id); if (current) { current.branches.push(row.branchName); current.branchIds.push(row.branchId); } else dentistMap.set(row.id, { id: row.id, firstName: row.firstName, lastName: row.lastName, slug: row.slug, specialty: row.specialty, photoUrl: row.photoUrl, branches: [row.branchName], branchIds: [row.branchId] }); });
      const safeHours = (value: string | null): Record<string, string> => { if (!value) return {}; try { const parsed: unknown = JSON.parse(value); return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, string> : {}; } catch { return {}; } };
      return { ...clinic, gallery: galleryRows, branches: branchRows.map((branch) => ({ ...branch, operatingHours: safeHours(branch.operatingHours) })), services: serviceRows, dentists: [...dentistMap.values()] };
    },
    getDentistBySlug: async (slug) => {
      const [dentist] = await database.select({ id: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName, slug: dentists.slug, specialty: dentists.specialty, bio: dentists.bio, photoUrl: dentists.photoUrl, licenseNumber: dentists.licenseNumber }).from(dentists).where(and(eq(dentists.slug, slug), publicDentist)).limit(1);
      if (!dentist) return null;
      const affiliationRows = await database.select({ assignmentId: dentistBranchAssignments.id, clinicId: clinics.id, clinicName: clinics.name, clinicSlug: clinics.slug, clinicLogoUrl: clinics.logoUrl, branchId: branches.id, branchName: branches.name, address: branches.address, city: branches.city, province: branches.province }).from(dentistBranchAssignments).innerJoin(clinics, eq(dentistBranchAssignments.clinicId, clinics.id)).innerJoin(branches, eq(dentistBranchAssignments.branchId, branches.id)).where(and(eq(dentistBranchAssignments.dentistId, dentist.id), eq(dentistBranchAssignments.isActive, 'true'), eq(branches.isActive, true), isNull(branches.deletedAt), publicClinic)).orderBy(clinics.name, branches.name);
      const clinicIds = [...new Set(affiliationRows.map((row) => row.clinicId))];
      const serviceRows = clinicIds.length ? await database.select({ clinicId: services.clinicId, name: services.name }).from(services).where(and(inArray(services.clinicId, clinicIds), eq(services.isActive, 'true'), eq(services.isBookable, true))).orderBy(services.name) : [];
      return { ...dentist, affiliations: affiliationRows.map((row) => ({ ...row, services: serviceRows.filter((service) => service.clinicId === row.clinicId).map((service) => service.name) })) };
    },
  };
}
