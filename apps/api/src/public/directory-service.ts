import { and, count, countDistinct, desc, eq, exists, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { appointments, branches, clinicGalleryItems, clinics, dentistBranchAssignments, dentists, services } from '@dentra/db/schema';
import { generatedSlots, overlaps, parseHours } from './booking-service.js';

const OPEN_SLOT_WINDOW_DAYS = 7;
const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed', 'checked_in', 'in_progress'] as const;
const VERIFICATION_WEIGHT: Record<string, number> = { verified: 2, pending: 1, unverified: 0 };

/**
 * Given (dentistId, branchId) assignment pairs, returns the subset of
 * dentistIds with at least one open slot in the next OPEN_SLOT_WINDOW_DAYS
 * across any of their listed branches. Batches all DB reads up front so this
 * is O(1) queries regardless of how many dentists/branches are checked —
 * a directory page cannot afford an N+1 per-result availability lookup.
 */
async function computeOpenDentistIds(database: DB, pairs: Array<{ dentistId: string; branchId: string }>): Promise<Set<string>> {
  if (!pairs.length) return new Set();
  const branchIds = [...new Set(pairs.map((pair) => pair.branchId))];
  const dentistIds = [...new Set(pairs.map((pair) => pair.dentistId))];
  const branchRows = await database.select({ id: branches.id, operatingHours: branches.operatingHours }).from(branches).where(inArray(branches.id, branchIds));
  const hoursByBranch = new Map(branchRows.map((branch) => [branch.id, branch.operatingHours]));
  const windowEnd = new Date(Date.now() + OPEN_SLOT_WINDOW_DAYS * 86_400_000);
  const busyRows = await database.select({ dentistId: appointments.dentistId, startsAt: appointments.startsAt, endsAt: appointments.endsAt }).from(appointments).where(and(inArray(appointments.dentistId, dentistIds), inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES), lt(appointments.startsAt, windowEnd)));
  const busyByDentist = new Map<string, Array<{ startsAt: Date; endsAt: Date | null }>>();
  busyRows.forEach((row) => { if (!row.dentistId) return; const list = busyByDentist.get(row.dentistId) ?? []; list.push({ startsAt: row.startsAt, endsAt: row.endsAt }); busyByDentist.set(row.dentistId, list); });
  const openDentistIds = new Set<string>();
  for (const dentistId of dentistIds) {
    const dentistBranchIds = pairs.filter((pair) => pair.dentistId === dentistId).map((pair) => pair.branchId);
    const busy = busyByDentist.get(dentistId) ?? [];
    let open = false;
    for (let dayOffset = 0; dayOffset < OPEN_SLOT_WINDOW_DAYS && !open; dayOffset++) {
      const date = new Date(Date.now() + dayOffset * 86_400_000).toISOString().slice(0, 10);
      for (const branchId of dentistBranchIds) {
        const hours = parseHours(hoursByBranch.get(branchId) ?? null, date);
        if (generatedSlots(hours, date, 30).some((slot) => !overlaps(slot, busy))) { open = true; break; }
      }
    }
    if (open) openDentistIds.add(dentistId);
  }
  return openDentistIds;
}

export type PublicListInput = { search: string; page: number; pageSize: number };
export type PublicClinicListInput = PublicListInput & { location: string; service: string; latitude?: number; longitude?: number; maxDistanceKm?: number };
export type PublicDentistListInput = PublicListInput & { specialty: string };
export type PublicDirectoryService = {
  listClinics: (input: PublicClinicListInput) => Promise<{ items: Array<{ id: string; name: string; slug: string; description: string | null; logoUrl: string | null; city: string | null; province: string | null; verificationStatus: string; locations: string[]; services: string[]; distanceKm?: number | null; hasOpenSlotSoon: boolean }>; pagination: Pagination }>;
  listDentists: (input: PublicDentistListInput) => Promise<{ items: Array<{ id: string; firstName: string; lastName: string; slug: string; specialty: string | null; bio: string | null; photoUrl: string | null; affiliatedClinicCount: number; hasOpenSlotSoon: boolean }>; pagination: Pagination }>;
  summary: () => Promise<{ publishedClinicCount: number; publishedDentistCount: number }>;
  getClinicBySlug: (slug: string) => Promise<PublicClinicDetail | null>;
  getDentistBySlug: (slug: string) => Promise<PublicDentistDetail | null>;
};
export type PublicClinicDetail = {
  id: string; name: string; slug: string; heroText: string | null; description: string | null;
  logoUrl: string | null; coverUrl: string | null; email: string | null; phone: string | null;
  website: string | null; address: string | null; city: string | null; province: string | null;
  mapUrl: string | null; facebookUrl: string | null; instagramUrl: string | null; verificationStatus: string;
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
      // Verification tier is ordered at the DB level so it's correct across pages, not just within one —
      // unlike distance/profile-completeness below, which (like the pre-existing distance sort) only refine order within the already-fetched page.
      const verificationRank = sql<number>`CASE ${clinics.verificationStatus} WHEN 'verified' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END`;
      const rows = await database.select({ id: clinics.id, name: clinics.name, slug: clinics.slug, description: clinics.description, logoUrl: clinics.logoUrl, city: clinics.city, province: clinics.province, verificationStatus: clinics.verificationStatus }).from(clinics).where(where).orderBy(verificationRank, desc(clinics.createdAt), clinics.name).limit(input.pageSize).offset((page - 1) * input.pageSize);
      const ids = rows.map((row) => row.id);
      const [branchRows, serviceRows] = ids.length ? await Promise.all([
        database.select({ id: branches.id, clinicId: branches.clinicId, city: branches.city, province: branches.province, latitude: branches.latitude, longitude: branches.longitude, operatingHours: branches.operatingHours }).from(branches).where(and(inArray(branches.clinicId, ids), eq(branches.isActive, true), isNull(branches.deletedAt))),
        database.select({ clinicId: services.clinicId, name: services.name }).from(services).where(and(inArray(services.clinicId, ids), eq(services.isActive, 'true'), eq(services.isBookable, true))).orderBy(services.name),
      ]) : [[], []];
      const branchIds = branchRows.map((branch) => branch.id);
      const assignmentRows = branchIds.length ? await database.select({ dentistId: dentistBranchAssignments.dentistId, branchId: dentistBranchAssignments.branchId }).from(dentistBranchAssignments).where(and(inArray(dentistBranchAssignments.branchId, branchIds), eq(dentistBranchAssignments.isActive, 'true'))) : [];
      const openDentistIds = await computeOpenDentistIds(database, assignmentRows);
      const openBranchIds = new Set(assignmentRows.filter((row) => openDentistIds.has(row.dentistId)).map((row) => row.branchId));
      const distance = (lat: number, lng: number, branchLat: string | null, branchLng: string | null) => { if (branchLat === null || branchLng === null) return null; const r = 6371; const dLat = (Number(branchLat) - lat) * Math.PI / 180; const dLng = (Number(branchLng) - lng) * Math.PI / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(Number(branchLat) * Math.PI / 180) * Math.sin(dLng / 2) ** 2; return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); };
      const hasGeo = input.latitude !== undefined && input.longitude !== undefined;
      const items = rows.map((row) => {
        const clinicBranches = branchRows.filter((branch) => branch.clinicId === row.id);
        const distances = hasGeo ? clinicBranches.map((branch) => distance(input.latitude!, input.longitude!, branch.latitude, branch.longitude)).filter((value): value is number => value !== null) : [];
        const distanceKm = distances.length ? Math.min(...distances) : null;
        const clinicServices = serviceRows.filter((item) => item.clinicId === row.id).map((item) => item.name);
        const profileCompleteness = [Boolean(row.description), Boolean(row.logoUrl), clinicServices.length > 0, clinicBranches.some((branch) => Boolean(branch.operatingHours))].filter(Boolean).length / 4;
        const hasOpenSlotSoon = clinicBranches.some((branch) => openBranchIds.has(branch.id));
        const rankScore = VERIFICATION_WEIGHT[row.verificationStatus] * 10 + profileCompleteness * 3 + (hasOpenSlotSoon ? 1 : 0);
        return { ...row, distanceKm, rankScore, hasOpenSlotSoon, locations: [...new Set(clinicBranches.map((branch) => [branch.city, branch.province].filter(Boolean).join(', ')).filter(Boolean))], services: clinicServices };
      }).filter((item) => input.maxDistanceKm === undefined || item.distanceKm === null || item.distanceKm <= input.maxDistanceKm);
      items.sort(hasGeo
        ? (a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER)
        : (a, b) => b.rankScore - a.rankScore);
      return { items: items.map(({ rankScore, ...item }) => item), pagination: { page, pageSize: input.pageSize, total, totalPages } };
    },
    listDentists: async (input) => {
      const search = `%${input.search.trim()}%`; const specialty = `%${input.specialty.trim()}%`;
      const where = and(publicDentist, input.search ? or(ilike(dentists.firstName, search), ilike(dentists.lastName, search), ilike(dentists.slug, search), ilike(dentists.specialty, search)) : undefined, input.specialty ? ilike(dentists.specialty, specialty) : undefined);
      const [totalRow] = await database.select({ total: count(dentists.id) }).from(dentists).where(where); const total = totalRow?.total ?? 0; const totalPages = Math.max(1, Math.ceil(total / input.pageSize)); const page = Math.min(input.page, totalPages);
      const rows = await database.select({ id: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName, slug: dentists.slug, specialty: dentists.specialty, bio: dentists.bio, photoUrl: dentists.photoUrl }).from(dentists).where(where).orderBy(dentists.lastName, dentists.firstName).limit(input.pageSize).offset((page - 1) * input.pageSize);
      const dentistIds = rows.map((row) => row.id);
      const [counts, assignmentRows] = dentistIds.length ? await Promise.all([
        database.select({ dentistId: dentistBranchAssignments.dentistId, total: countDistinct(dentistBranchAssignments.clinicId) }).from(dentistBranchAssignments).innerJoin(clinics, eq(dentistBranchAssignments.clinicId, clinics.id)).where(and(inArray(dentistBranchAssignments.dentistId, dentistIds), eq(dentistBranchAssignments.isActive, 'true'), publicClinic)).groupBy(dentistBranchAssignments.dentistId),
        database.select({ dentistId: dentistBranchAssignments.dentistId, branchId: dentistBranchAssignments.branchId }).from(dentistBranchAssignments).innerJoin(branches, eq(dentistBranchAssignments.branchId, branches.id)).where(and(inArray(dentistBranchAssignments.dentistId, dentistIds), eq(dentistBranchAssignments.isActive, 'true'), eq(branches.isActive, true), isNull(branches.deletedAt))),
      ]) : [[], []];
      const map = new Map(counts.map((row) => [row.dentistId, row.total]));
      const openDentistIds = await computeOpenDentistIds(database, assignmentRows);
      return { items: rows.map((row) => ({ ...row, affiliatedClinicCount: map.get(row.id) ?? 0, hasOpenSlotSoon: openDentistIds.has(row.id) })), pagination: { page, pageSize: input.pageSize, total, totalPages } };
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
        facebookUrl: clinics.facebookUrl, instagramUrl: clinics.instagramUrl, verificationStatus: clinics.verificationStatus, themePreset: clinics.themePreset, brandAccent: clinics.brandAccent, showGallery: clinics.showGallery, showTeam: clinics.showTeam, showServices: clinics.showServices, seoTitle: clinics.seoTitle, seoDescription: clinics.seoDescription, ogImageUrl: clinics.ogImageUrl,
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
