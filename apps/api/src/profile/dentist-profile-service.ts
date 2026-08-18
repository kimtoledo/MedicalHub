import { and, asc, eq, isNull } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { branches, clinics, dentistBranchAssignments, dentists, dentistSchedules, dentistTimeOff } from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';

export type DentistProfileInput = { bio: string | null; specialty: string | null; phone: string | null; email: string | null; photoUrl: string | null; licenseNumber: string | null };
export type DentistProfileActor = { id: string; email: string; clinicId: string; ipAddress?: string; userAgent?: string };
export type DentistScheduleRowInput = { weekday: number; startsAt: number; endsAt: number };
export type DentistTimeOffInput = { startDate: string; endDate: string; reason: string | null };
export class DentistProfileError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
export type DentistProfileService = ReturnType<typeof createDentistProfileService>;

function isPrcLicenseConstraint(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const databaseError = error as { code?: unknown; constraint_name?: unknown };
  return databaseError.code === '23505' && databaseError.constraint_name === 'dentists_license_number_unique';
}

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
      try {
        await database.transaction(async (tx) => {
          const [current] = await tx.select({ licenseNumber: dentists.licenseNumber, specialty: dentists.specialty, bio: dentists.bio, photoUrl: dentists.photoUrl, phone: dentists.phone, email: dentists.email }).from(dentists).where(and(eq(dentists.id, dentistId), isNull(dentists.deletedAt))).limit(1);
          if (!current) throw new DentistProfileError('DENTIST_NOT_FOUND', 'Dentist profile not found', 404);
          const changedFields = (Object.keys(input) as Array<keyof DentistProfileInput>).filter((field) => input[field] !== current[field]);
          if (!changedFields.length) return;
          await tx.update(dentists).set({ ...input, updatedAt: new Date() }).where(eq(dentists.id, dentistId));
          await writeAudit(tx as unknown as DB, { actorId: actor.id, actorEmail: actor.email, clinicId: actor.clinicId, entityType: 'dentist', entityId: dentistId, action: AuditAction.DENTIST_PROFILE_UPDATED, metadata: JSON.stringify({ changedFields }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        });
      } catch (caught) {
        if (caught instanceof DentistProfileError) throw caught;
        if (isPrcLicenseConstraint(caught)) throw new DentistProfileError('PRC_LICENSE_TAKEN', 'Another dentist profile already uses this PRC license number', 409);
        throw caught;
      }
      return get(dentistId);
    },
    getSchedule: async (dentistId: string, branchId: string) => {
      const [assignment] = await database.select({ id: dentistBranchAssignments.id }).from(dentistBranchAssignments).where(and(eq(dentistBranchAssignments.dentistId, dentistId), eq(dentistBranchAssignments.branchId, branchId), eq(dentistBranchAssignments.isActive, 'true'))).limit(1);
      if (!assignment) throw new DentistProfileError('BRANCH_NOT_ASSIGNED', 'You are not assigned to this branch', 404);
      return database.select({ weekday: dentistSchedules.weekday, startsAt: dentistSchedules.startsAt, endsAt: dentistSchedules.endsAt }).from(dentistSchedules).where(and(eq(dentistSchedules.dentistId, dentistId), eq(dentistSchedules.branchId, branchId))).orderBy(asc(dentistSchedules.weekday));
    },
    setSchedule: async (dentistId: string, branchId: string, rows: DentistScheduleRowInput[], actor: DentistProfileActor) => {
      const invalid = rows.find((row) => row.weekday < 0 || row.weekday > 6 || row.startsAt >= row.endsAt || row.startsAt < 0 || row.endsAt > 24 * 60);
      if (invalid) throw new DentistProfileError('INVALID_SCHEDULE', 'Each working-hours row needs a valid weekday and a start time before its end time');
      const weekdays = new Set(rows.map((row) => row.weekday));
      if (weekdays.size !== rows.length) throw new DentistProfileError('INVALID_SCHEDULE', 'Each weekday can only be configured once');
      await database.transaction(async (tx) => {
        const [assignment] = await tx.select({ id: dentistBranchAssignments.id }).from(dentistBranchAssignments).where(and(eq(dentistBranchAssignments.dentistId, dentistId), eq(dentistBranchAssignments.branchId, branchId), eq(dentistBranchAssignments.isActive, 'true'))).limit(1);
        if (!assignment) throw new DentistProfileError('BRANCH_NOT_ASSIGNED', 'You are not assigned to this branch', 404);
        await tx.delete(dentistSchedules).where(and(eq(dentistSchedules.dentistId, dentistId), eq(dentistSchedules.branchId, branchId)));
        if (rows.length) await tx.insert(dentistSchedules).values(rows.map((row) => ({ dentistId, branchId, weekday: row.weekday, startsAt: row.startsAt, endsAt: row.endsAt })));
        await writeAudit(tx as unknown as DB, { actorId: actor.id, actorEmail: actor.email, clinicId: actor.clinicId, entityType: 'dentist', entityId: dentistId, action: AuditAction.DENTIST_PROFILE_UPDATED, metadata: JSON.stringify({ fields: ['schedule'], branchId, weekdays: rows.map((row) => row.weekday) }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      });
      return database.select({ weekday: dentistSchedules.weekday, startsAt: dentistSchedules.startsAt, endsAt: dentistSchedules.endsAt }).from(dentistSchedules).where(and(eq(dentistSchedules.dentistId, dentistId), eq(dentistSchedules.branchId, branchId))).orderBy(asc(dentistSchedules.weekday));
    },
    listTimeOff: async (dentistId: string) => database.select({ id: dentistTimeOff.id, startDate: dentistTimeOff.startDate, endDate: dentistTimeOff.endDate, reason: dentistTimeOff.reason }).from(dentistTimeOff).where(eq(dentistTimeOff.dentistId, dentistId)).orderBy(asc(dentistTimeOff.startDate)),
    addTimeOff: async (dentistId: string, input: DentistTimeOffInput, actor: DentistProfileActor) => {
      if (input.endDate < input.startDate) throw new DentistProfileError('INVALID_TIME_OFF', 'End date must be on or after the start date');
      return database.transaction(async (tx) => {
        const [created] = await tx.insert(dentistTimeOff).values({ dentistId, startDate: input.startDate, endDate: input.endDate, reason: input.reason }).returning({ id: dentistTimeOff.id, startDate: dentistTimeOff.startDate, endDate: dentistTimeOff.endDate, reason: dentistTimeOff.reason });
        await writeAudit(tx as unknown as DB, { actorId: actor.id, actorEmail: actor.email, clinicId: actor.clinicId, entityType: 'dentist', entityId: dentistId, action: AuditAction.DENTIST_PROFILE_UPDATED, metadata: JSON.stringify({ fields: ['time_off'], timeOffId: created.id }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        return created;
      });
    },
    removeTimeOff: async (dentistId: string, timeOffId: string, actor: DentistProfileActor) => database.transaction(async (tx) => {
      const [deleted] = await tx.delete(dentistTimeOff).where(and(eq(dentistTimeOff.id, timeOffId), eq(dentistTimeOff.dentistId, dentistId))).returning({ id: dentistTimeOff.id });
      if (!deleted) throw new DentistProfileError('TIME_OFF_NOT_FOUND', 'Time off entry not found', 404);
      await writeAudit(tx as unknown as DB, { actorId: actor.id, actorEmail: actor.email, clinicId: actor.clinicId, entityType: 'dentist', entityId: dentistId, action: AuditAction.DENTIST_PROFILE_UPDATED, metadata: JSON.stringify({ fields: ['time_off'], timeOffId }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return deleted;
    }),
  };
}
