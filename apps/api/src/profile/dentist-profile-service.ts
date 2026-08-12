import { and, eq, isNull } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { branches, clinics, dentistBranchAssignments, dentists } from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';

export type DentistProfileInput = { bio: string | null; specialty: string | null; phone: string | null; email: string | null; photoUrl: string | null; licenseNumber: string | null };
export type DentistProfileActor = { id: string; email: string; clinicId: string; ipAddress?: string; userAgent?: string };
export class DentistProfileError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
export type DentistProfileService = ReturnType<typeof createDentistProfileService>;

export function createDentistProfileService(database: DB) {
  const get = async (dentistId: string) => {
    const [profile] = await database.select().from(dentists).where(and(eq(dentists.id, dentistId), isNull(dentists.deletedAt))).limit(1);
    if (!profile) throw new DentistProfileError('DENTIST_NOT_FOUND', 'Dentist profile not found', 404);
    const affiliations = await database.select({ clinicId: clinics.id, clinicName: clinics.name, branchId: branches.id, branchName: branches.name })
      .from(dentistBranchAssignments)
      .innerJoin(clinics, eq(dentistBranchAssignments.clinicId, clinics.id))
      .innerJoin(branches, eq(dentistBranchAssignments.branchId, branches.id))
      .where(and(eq(dentistBranchAssignments.dentistId, dentistId), eq(dentistBranchAssignments.isActive, 'true')));
    return { id: profile.id, firstName: profile.firstName, lastName: profile.lastName, slug: profile.slug, licenseNumber: profile.licenseNumber, specialty: profile.specialty, bio: profile.bio, photoUrl: profile.photoUrl, phone: profile.phone, email: profile.email, verificationStatus: profile.verificationStatus, publicationStatus: profile.publicationStatus, affiliations };
  };
  return {
    get,
    update: async (dentistId: string, input: DentistProfileInput, actor: DentistProfileActor) => {
      await database.transaction(async (tx) => {
        const [current] = await tx.select({ licenseNumber: dentists.licenseNumber, specialty: dentists.specialty, bio: dentists.bio, photoUrl: dentists.photoUrl, phone: dentists.phone, email: dentists.email }).from(dentists).where(and(eq(dentists.id, dentistId), isNull(dentists.deletedAt))).limit(1);
        if (!current) throw new DentistProfileError('DENTIST_NOT_FOUND', 'Dentist profile not found', 404);
        const changedFields = (Object.keys(input) as Array<keyof DentistProfileInput>).filter((field) => input[field] !== current[field]);
        if (!changedFields.length) return;
        await tx.update(dentists).set({ ...input, updatedAt: new Date() }).where(eq(dentists.id, dentistId));
        await writeAudit(tx as unknown as DB, { actorId: actor.id, actorEmail: actor.email, clinicId: actor.clinicId, entityType: 'dentist', entityId: dentistId, action: AuditAction.DENTIST_PROFILE_UPDATED, metadata: JSON.stringify({ changedFields }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      });
      return get(dentistId);
    },
  };
}
