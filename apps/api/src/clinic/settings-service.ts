import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { branches, branchHours, clinicClosures, clinicGalleryItems, clinics } from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';
export type ClinicSettingsActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export type ClinicProfileInput = { heroText: string | null; description: string | null; email: string | null; phone: string | null; website: string | null; address: string | null; city: string | null; province: string | null; mapUrl: string | null; facebookUrl: string | null; instagramUrl: string | null; themePreset?: string; brandAccent?: string; showGallery?: boolean; showTeam?: boolean; showServices?: boolean; seoTitle?: string | null; seoDescription?: string | null; ogImageUrl?: string | null };
export type BranchLocationInput = { address: string | null; city: string | null; province: string | null; mapUrl: string | null };
export type BranchHoursRowInput = { weekday: number; opensAt: number | null; closesAt: number | null; isClosed: boolean };
export type ClosureInput = { branchId: string | null; date: string; label: string };
export type ClinicSettings = ClinicProfileInput & { id: string; name: string; slug: string; publicationStatus: string; branches: Array<{ id: string; name: string; hours: BranchHoursRowInput[] } & BranchLocationInput>; gallery?: Array<{ id: string; imageUrl: string; altText: string; caption: string | null; sortOrder: string; isPublished: boolean }> };
export class ClinicSettingsError extends Error { constructor(public readonly code: 'CLINIC_NOT_FOUND' | 'BRANCH_NOT_FOUND' | 'CLOSURE_NOT_FOUND' | 'INVALID_HOURS', message: string) { super(message); this.name = 'ClinicSettingsError'; } }
export type ClinicSettingsService = {
  get: (clinicId: string) => Promise<ClinicSettings | null>;
  updateProfile: (clinicId: string, input: ClinicProfileInput, actor: ClinicSettingsActor) => Promise<{ id: string }>;
  updateBranchHours: (clinicId: string, branchId: string, hours: BranchHoursRowInput[], actor: ClinicSettingsActor) => Promise<{ id: string; hours: BranchHoursRowInput[] }>;
  updateBranchLocation: (clinicId: string, branchId: string, input: BranchLocationInput, actor: ClinicSettingsActor) => Promise<{ id: string }>;
  addGalleryItem?: (clinicId: string, input: { imageUrl: string; altText: string; caption?: string | null; sortOrder?: string }, actor: ClinicSettingsActor) => Promise<{ id: string }>;
  removeGalleryItem?: (clinicId: string, itemId: string, actor: ClinicSettingsActor) => Promise<{ id: string }>;
  listClosures: (clinicId: string) => Promise<Array<{ id: string; branchId: string | null; date: string; label: string; source: string; isEnabled: boolean }>>;
  addClosure: (clinicId: string, input: ClosureInput, actor: ClinicSettingsActor) => Promise<{ id: string }>;
  setClosureEnabled: (clinicId: string, closureId: string, isEnabled: boolean, actor: ClinicSettingsActor) => Promise<{ id: string }>;
  removeClosure: (clinicId: string, closureId: string, actor: ClinicSettingsActor) => Promise<{ id: string }>;
};
export function createClinicSettingsService(database: DB): ClinicSettingsService { return {
  get: async (clinicId) => {
    const [clinic] = await database.select({ id: clinics.id, name: clinics.name, slug: clinics.slug, publicationStatus: clinics.publicationStatus, heroText: clinics.heroText, description: clinics.description, email: clinics.email, phone: clinics.phone, website: clinics.website, address: clinics.address, city: clinics.city, province: clinics.province, mapUrl: clinics.mapUrl, facebookUrl: clinics.facebookUrl, instagramUrl: clinics.instagramUrl, themePreset: clinics.themePreset, brandAccent: clinics.brandAccent, showGallery: clinics.showGallery, showTeam: clinics.showTeam, showServices: clinics.showServices, seoTitle: clinics.seoTitle, seoDescription: clinics.seoDescription, ogImageUrl: clinics.ogImageUrl }).from(clinics).where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt))).limit(1);
    if (!clinic) return null;
    const [branchRows, gallery] = await Promise.all([
      database.select({ id: branches.id, name: branches.name, address: branches.address, city: branches.city, province: branches.province, mapUrl: branches.mapUrl }).from(branches).where(and(eq(branches.clinicId, clinicId), eq(branches.isActive, true), isNull(branches.deletedAt))).orderBy(desc(branches.isMain), branches.name),
      database.select({ id: clinicGalleryItems.id, imageUrl: clinicGalleryItems.imageUrl, altText: clinicGalleryItems.altText, caption: clinicGalleryItems.caption, sortOrder: clinicGalleryItems.sortOrder, isPublished: clinicGalleryItems.isPublished }).from(clinicGalleryItems).where(eq(clinicGalleryItems.clinicId, clinicId)),
    ]);
    const branchIds = branchRows.map((branch) => branch.id);
    const allHours = branchIds.length ? await database.select({ branchId: branchHours.branchId, weekday: branchHours.weekday, opensAt: branchHours.opensAt, closesAt: branchHours.closesAt, isClosed: branchHours.isClosed }).from(branchHours).where(inArray(branchHours.branchId, branchIds)) : [];
    return { ...clinic, gallery, branches: branchRows.map((branch) => ({ ...branch, hours: allHours.filter((h) => h.branchId === branch.id) })) };
  },
  updateProfile: async (clinicId, input, actor) => database.transaction(async (transaction) => { const [updated] = await transaction.update(clinics).set(input).where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt))).returning({ id: clinics.id }); if (!updated) throw new ClinicSettingsError('CLINIC_NOT_FOUND', 'Clinic not found'); await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'clinic', entityId: clinicId, action: AuditAction.CLINIC_UPDATED, metadata: JSON.stringify({ fields: Object.keys(input) }), ipAddress: actor.ipAddress, userAgent: actor.userAgent }); return updated; }),
  updateBranchHours: async (clinicId, branchId, hours, actor) => {
    const invalid = hours.find((row) => row.weekday < 0 || row.weekday > 6 || (!row.isClosed && (row.opensAt == null || row.closesAt == null || row.opensAt >= row.closesAt)));
    if (invalid) throw new ClinicSettingsError('INVALID_HOURS', 'Each open day needs a start time before its end time');
    return database.transaction(async (transaction) => {
      const [updated] = await transaction.select({ id: branches.id }).from(branches).where(and(eq(branches.id, branchId), eq(branches.clinicId, clinicId), eq(branches.isActive, true), isNull(branches.deletedAt))).limit(1);
      if (!updated) throw new ClinicSettingsError('BRANCH_NOT_FOUND', 'Clinic branch not found');
      await transaction.delete(branchHours).where(eq(branchHours.branchId, branchId));
      if (hours.length) await transaction.insert(branchHours).values(hours.map((row) => ({ branchId, weekday: row.weekday, opensAt: row.isClosed ? null : row.opensAt, closesAt: row.isClosed ? null : row.closesAt, isClosed: row.isClosed })));
      await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'branch', entityId: branchId, action: AuditAction.BRANCH_UPDATED, metadata: JSON.stringify({ fields: ['hours'] }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return { id: updated.id, hours };
    });
  },
  updateBranchLocation: async (clinicId, branchId, input, actor) => database.transaction(async (transaction) => { const [updated] = await transaction.update(branches).set(input).where(and(eq(branches.id, branchId), eq(branches.clinicId, clinicId), eq(branches.isActive, true), isNull(branches.deletedAt))).returning({ id: branches.id }); if (!updated) throw new ClinicSettingsError('BRANCH_NOT_FOUND', 'Clinic branch not found'); await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'branch', entityId: branchId, action: AuditAction.BRANCH_UPDATED, metadata: JSON.stringify({ fields: Object.keys(input) }), ipAddress: actor.ipAddress, userAgent: actor.userAgent }); return updated; }),
  addGalleryItem: async (clinicId, input, actor) => database.transaction(async (transaction) => { const [created] = await transaction.insert(clinicGalleryItems).values({ clinicId, imageUrl: input.imageUrl, altText: input.altText, caption: input.caption ?? null, sortOrder: input.sortOrder ?? '0' }).returning({ id: clinicGalleryItems.id }); await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'clinic_gallery_item', entityId: created.id, action: AuditAction.CLINIC_UPDATED, metadata: JSON.stringify({ fields: ['gallery'] }), ipAddress: actor.ipAddress, userAgent: actor.userAgent }); return created; }),
  removeGalleryItem: async (clinicId, itemId, actor) => database.transaction(async (transaction) => { const [deleted] = await transaction.delete(clinicGalleryItems).where(and(eq(clinicGalleryItems.id, itemId), eq(clinicGalleryItems.clinicId, clinicId))).returning({ id: clinicGalleryItems.id }); if (!deleted) throw new ClinicSettingsError('BRANCH_NOT_FOUND', 'Gallery item not found'); await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'clinic_gallery_item', entityId: itemId, action: AuditAction.CLINIC_UPDATED, metadata: JSON.stringify({ fields: ['gallery'] }), ipAddress: actor.ipAddress, userAgent: actor.userAgent }); return deleted; }),
  listClosures: async (clinicId) => database.select({ id: clinicClosures.id, branchId: clinicClosures.branchId, date: clinicClosures.date, label: clinicClosures.label, source: clinicClosures.source, isEnabled: clinicClosures.isEnabled }).from(clinicClosures).where(eq(clinicClosures.clinicId, clinicId)).orderBy(asc(clinicClosures.date)),
  addClosure: async (clinicId, input, actor) => database.transaction(async (transaction) => {
    if (input.branchId) { const [branch] = await transaction.select({ id: branches.id }).from(branches).where(and(eq(branches.id, input.branchId), eq(branches.clinicId, clinicId))).limit(1); if (!branch) throw new ClinicSettingsError('BRANCH_NOT_FOUND', 'Clinic branch not found'); }
    const [created] = await transaction.insert(clinicClosures).values({ clinicId, branchId: input.branchId, date: input.date, label: input.label, source: 'custom', isEnabled: true }).returning({ id: clinicClosures.id });
    await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'clinic_closure', entityId: created.id, action: AuditAction.CLINIC_UPDATED, metadata: JSON.stringify({ fields: ['closures'], date: input.date }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
    return created;
  }),
  setClosureEnabled: async (clinicId, closureId, isEnabled, actor) => database.transaction(async (transaction) => {
    const [updated] = await transaction.update(clinicClosures).set({ isEnabled }).where(and(eq(clinicClosures.id, closureId), eq(clinicClosures.clinicId, clinicId))).returning({ id: clinicClosures.id });
    if (!updated) throw new ClinicSettingsError('CLOSURE_NOT_FOUND', 'Closure not found');
    await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'clinic_closure', entityId: closureId, action: AuditAction.CLINIC_UPDATED, metadata: JSON.stringify({ fields: ['closures'], isEnabled }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
    return updated;
  }),
  removeClosure: async (clinicId, closureId, actor) => database.transaction(async (transaction) => {
    const [deleted] = await transaction.delete(clinicClosures).where(and(eq(clinicClosures.id, closureId), eq(clinicClosures.clinicId, clinicId))).returning({ id: clinicClosures.id });
    if (!deleted) throw new ClinicSettingsError('CLOSURE_NOT_FOUND', 'Closure not found');
    await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'clinic_closure', entityId: closureId, action: AuditAction.CLINIC_UPDATED, metadata: JSON.stringify({ fields: ['closures'] }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
    return deleted;
  }),
}; }
