import { and, asc, eq, gt, inArray, isNull, lt, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import {
  appointments,
  appointmentStatusHistory,
  branches,
  branchHours,
  clinicClosures,
  clinics,
  dentistBranchAssignments,
  dentists,
  dentistSchedules,
  dentistTimeOff,
  services,
} from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';
import type { NotificationService } from '../notifications/service.js';
import { appointmentReminderNotification, bookingConfirmationNotification } from '../notifications/service.js';
import type { IntegrationService } from '../integrations/service.js';

const MANILA_OFFSET = '+08:00';
const activeStatuses = ['pending', 'confirmed', 'checked_in', 'in_progress'] as const;

export type AvailabilityInput = {
  clinicSlug: string;
  branchId: string;
  serviceId: string;
  dentistId?: string;
  date: string;
};
export type PublicBookingInput = AvailabilityInput & {
  startsAt: string;
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string;
  patientEmail?: string;
  chiefComplaint: string;
};
export type AvailableSlot = { startsAt: string; endsAt: string };
export type PublicBookingResult = {
  appointmentId: string;
  confirmationNumber: string;
  clinicName: string;
  branchName: string;
  serviceName: string;
  dentistName: string;
  startsAt: string;
  endsAt: string;
  status: 'pending';
};
export type PublicBookingService = {
  availability: (input: AvailabilityInput) => Promise<{ date: string; durationMinutes: number; slots: AvailableSlot[]; closedReason: string | null }>;
  book: (input: PublicBookingInput, request: { ipAddress?: string; userAgent?: string }) => Promise<PublicBookingResult>;
};

export class PublicBookingError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode = 400) { super(message); }
}

export type HourRange = [number, number];
export type BranchHourRow = { weekday: number; opensAt: number | null; closesAt: number | null; isClosed: boolean };
export type ClosureRow = { branchId: string | null; date: string; label: string; isEnabled: boolean };
export type DentistScheduleRow = { dentistId: string; branchId: string; weekday: number; startsAt: number; endsAt: number };
export type TimeOffRow = { dentistId: string; startDate: string; endDate: string };

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00${MANILA_OFFSET}`).getUTCDay();
}

/** Resolves a branch's open range for a date from structured branch_hours rows. No row = closed. */
export function resolveBranchRange(rows: BranchHourRow[], date: string): HourRange | null {
  const row = rows.find((r) => r.weekday === weekdayOf(date));
  if (!row || row.isClosed || row.opensAt == null || row.closesAt == null || row.opensAt >= row.closesAt) return null;
  return [row.opensAt, row.closesAt];
}

/** Finds an enabled closure covering the date; a branch-specific row takes precedence over a clinic-wide one. */
export function resolveClosure(rows: ClosureRow[], branchId: string, date: string): string | null {
  const enabled = rows.filter((r) => r.isEnabled && r.date === date);
  const specific = enabled.find((r) => r.branchId === branchId);
  return specific?.label ?? enabled.find((r) => r.branchId === null)?.label ?? null;
}

/**
 * A dentist with zero configured schedule rows at this branch is unrestricted
 * (falls back to the branch's own range) for backward compatibility with
 * dentists who haven't set up individual hours yet. Once at least one row is
 * configured for that dentist/branch, every other weekday becomes "not
 * working" by omission, and the configured range is clamped to the branch's
 * open hours.
 */
export function resolveDentistRange(rows: DentistScheduleRow[], dentistId: string, branchId: string, date: string, branchRange: HourRange): HourRange | null {
  const configured = rows.filter((r) => r.dentistId === dentistId && r.branchId === branchId);
  if (!configured.length) return branchRange;
  const row = configured.find((r) => r.weekday === weekdayOf(date));
  if (!row) return null;
  const start = Math.max(row.startsAt, branchRange[0]);
  const end = Math.min(row.endsAt, branchRange[1]);
  return start < end ? [start, end] : null;
}

export function isOnTimeOff(rows: TimeOffRow[], dentistId: string, date: string): boolean {
  return rows.some((r) => r.dentistId === dentistId && r.startDate <= date && date <= r.endDate);
}

function instant(date: string, minute: number): Date {
  const hour = String(Math.floor(minute / 60)).padStart(2, '0');
  const mins = String(minute % 60).padStart(2, '0');
  return new Date(`${date}T${hour}:${mins}:00${MANILA_OFFSET}`);
}

function duration(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 15 && parsed <= 240 ? parsed : 30;
}

export function generatedSlots(hours: HourRange | null, date: string, durationMinutes: number): AvailableSlot[] {
  if (!hours) return [];
  const result: AvailableSlot[] = [];
  for (let cursor = hours[0]; cursor + durationMinutes <= hours[1]; cursor += 30) {
    const start = instant(date, cursor); const end = instant(date, cursor + durationMinutes);
    if (start.getTime() > Date.now()) result.push({ startsAt: start.toISOString(), endsAt: end.toISOString() });
  }
  return result;
}

/** Whether a generated slot fits entirely inside a dentist's resolved range for that date. */
export function withinDentistRange(slot: AvailableSlot, date: string, range: HourRange | null): boolean {
  if (!range) return false;
  const start = new Date(slot.startsAt).getTime(); const end = new Date(slot.endsAt).getTime();
  return instant(date, range[0]).getTime() <= start && end <= instant(date, range[1]).getTime();
}

export function overlaps(slot: AvailableSlot, busy: Array<{ startsAt: Date; endsAt: Date | null }>): boolean {
  const start = new Date(slot.startsAt).getTime(); const end = new Date(slot.endsAt).getTime();
  return busy.some((item) => item.startsAt.getTime() < end && (item.endsAt?.getTime() ?? Number.POSITIVE_INFINITY) > start);
}

export function createPublicBookingService(database: DB, notifications?: NotificationService, integrations?: IntegrationService): PublicBookingService {
  const loadContext = async (input: AvailabilityInput, transaction: DB = database) => {
    const [context] = await transaction.select({ clinicId: clinics.id, clinicName: clinics.name, branchId: branches.id, branchName: branches.name, serviceId: services.id, serviceName: services.name, durationMinutes: services.durationMinutes })
      .from(clinics).innerJoin(branches, eq(branches.clinicId, clinics.id)).innerJoin(services, eq(services.clinicId, clinics.id))
      .where(and(eq(clinics.slug, input.clinicSlug), eq(clinics.publicationStatus, 'published'), inArray(clinics.status, ['trial', 'active']), isNull(clinics.deletedAt), eq(branches.id, input.branchId), eq(branches.isActive, true), isNull(branches.deletedAt), eq(services.id, input.serviceId), eq(services.isActive, 'true'), eq(services.isBookable, true))).limit(1);
    if (!context) throw new PublicBookingError('BOOKING_CONTEXT_UNAVAILABLE', 'The selected clinic, branch, or service is unavailable', 404);
    const assignments = await transaction.select({ assignmentId: dentistBranchAssignments.id, dentistId: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName })
      .from(dentistBranchAssignments).innerJoin(dentists, eq(dentistBranchAssignments.dentistId, dentists.id))
      .where(and(eq(dentistBranchAssignments.clinicId, context.clinicId), eq(dentistBranchAssignments.branchId, context.branchId), eq(dentistBranchAssignments.isActive, 'true'), input.dentistId ? eq(dentists.id, input.dentistId) : undefined, eq(dentists.verificationStatus, 'verified'), eq(dentists.publicationStatus, 'published'), isNull(dentists.deletedAt))).orderBy(asc(dentists.lastName), asc(dentists.firstName));
    if (!assignments.length) throw new PublicBookingError('DENTIST_UNAVAILABLE', 'No active dentist is available for this selection', 404);
    return { context, assignments };
  };

  const loadSchedule = async (context: { clinicId: string; branchId: string }, dentistIds: string[], transaction: DB = database) => {
    const [hours, closures, schedules, timeOff] = await Promise.all([
      transaction.select({ weekday: branchHours.weekday, opensAt: branchHours.opensAt, closesAt: branchHours.closesAt, isClosed: branchHours.isClosed }).from(branchHours).where(eq(branchHours.branchId, context.branchId)),
      transaction.select({ branchId: clinicClosures.branchId, date: clinicClosures.date, label: clinicClosures.label, isEnabled: clinicClosures.isEnabled }).from(clinicClosures).where(eq(clinicClosures.clinicId, context.clinicId)),
      transaction.select({ dentistId: dentistSchedules.dentistId, branchId: dentistSchedules.branchId, weekday: dentistSchedules.weekday, startsAt: dentistSchedules.startsAt, endsAt: dentistSchedules.endsAt }).from(dentistSchedules).where(and(eq(dentistSchedules.branchId, context.branchId), inArray(dentistSchedules.dentistId, dentistIds))),
      transaction.select({ dentistId: dentistTimeOff.dentistId, startDate: dentistTimeOff.startDate, endDate: dentistTimeOff.endDate }).from(dentistTimeOff).where(inArray(dentistTimeOff.dentistId, dentistIds)),
    ]);
    return { hours, closures, schedules, timeOff };
  };

  return {
    availability: async (input) => {
      const { context, assignments } = await loadContext(input); const minutes = duration(context.durationMinutes);
      const { hours, closures, schedules, timeOff } = await loadSchedule(context, assignments.map((item) => item.dentistId));
      const closedReason = resolveClosure(closures, context.branchId, input.date);
      if (closedReason) return { date: input.date, durationMinutes: minutes, slots: [], closedReason };
      const branchRange = resolveBranchRange(hours, input.date);
      const slots = generatedSlots(branchRange, input.date, minutes);
      if (!slots.length) return { date: input.date, durationMinutes: minutes, slots: [], closedReason: branchRange ? null : 'Clinic closed' };
      const eligible = assignments.filter((assignment) => !isOnTimeOff(timeOff, assignment.dentistId, input.date));
      if (!eligible.length) return { date: input.date, durationMinutes: minutes, slots: [], closedReason: 'No dentist available' };
      const ranges = new Map(eligible.map((assignment) => [assignment.dentistId, resolveDentistRange(schedules, assignment.dentistId, context.branchId, input.date, branchRange!)]));
      const dayStart = instant(input.date, 0); const dayEnd = instant(input.date, 24 * 60);
      const busy = await database.select({ dentistId: appointments.dentistId, startsAt: appointments.startsAt, endsAt: appointments.endsAt }).from(appointments).where(and(inArray(appointments.dentistId, eligible.map((item) => item.dentistId)), inArray(appointments.status, [...activeStatuses]), lt(appointments.startsAt, dayEnd), or(isNull(appointments.endsAt), gt(appointments.endsAt, dayStart))));
      const available = slots.filter((slot) => eligible.some((assignment) => withinDentistRange(slot, input.date, ranges.get(assignment.dentistId) ?? null) && !overlaps(slot, busy.filter((item) => item.dentistId === assignment.dentistId))));
      return { date: input.date, durationMinutes: minutes, slots: available, closedReason: null };
    },
    book: async (input, request) => {
      const result = await database.transaction(async (transaction) => {
      const { context, assignments } = await loadContext(input, transaction as unknown as DB);
      const { hours, closures, schedules, timeOff } = await loadSchedule(context, assignments.map((item) => item.dentistId), transaction as unknown as DB);
      const closedReason = resolveClosure(closures, context.branchId, input.date);
      if (closedReason) throw new PublicBookingError('CLINIC_CLOSED', `The clinic is closed on this date (${closedReason})`, 409);
      const minutes = duration(context.durationMinutes); const branchRange = resolveBranchRange(hours, input.date); const validSlots = generatedSlots(branchRange, input.date, minutes);
      const requested = validSlots.find((slot) => slot.startsAt === new Date(input.startsAt).toISOString());
      if (!requested) throw new PublicBookingError('INVALID_SLOT', 'The selected time is outside current operating hours or is in the past');
      const eligible = assignments.filter((assignment) => !isOnTimeOff(timeOff, assignment.dentistId, input.date));
      const candidates = await transaction.select({ assignmentId: dentistBranchAssignments.id, dentistId: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName })
        .from(dentistBranchAssignments).innerJoin(dentists, eq(dentistBranchAssignments.dentistId, dentists.id))
        .where(and(eq(dentistBranchAssignments.clinicId, context.clinicId), eq(dentistBranchAssignments.branchId, context.branchId), eq(dentistBranchAssignments.isActive, 'true'), inArray(dentists.id, eligible.map((item) => item.dentistId)), eq(dentists.verificationStatus, 'verified'), eq(dentists.publicationStatus, 'published'), isNull(dentists.deletedAt))).orderBy(asc(dentists.lastName), asc(dentists.firstName)).for('update');
      if (!candidates.length) throw new PublicBookingError('DENTIST_UNAVAILABLE', 'The selected dentist is no longer available', 409);
      let selected: typeof candidates[number] | undefined;
      for (const candidate of candidates) {
        const range = resolveDentistRange(schedules, candidate.dentistId, context.branchId, input.date, branchRange!);
        if (!withinDentistRange(requested, input.date, range)) continue;
        const [conflict] = await transaction.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.dentistId, candidate.dentistId), inArray(appointments.status, [...activeStatuses]), lt(appointments.startsAt, new Date(requested.endsAt)), or(isNull(appointments.endsAt), gt(appointments.endsAt, new Date(requested.startsAt))))).limit(1);
        if (!conflict) { selected = candidate; break; }
      }
      if (!selected) throw new PublicBookingError('SLOT_CONFLICT', 'That time was just booked. Please choose another available slot.', 409);
      const [created] = await transaction.insert(appointments).values({ clinicId: context.clinicId, branchId: context.branchId, serviceId: context.serviceId, dentistId: selected.dentistId, status: 'pending', startsAt: new Date(requested.startsAt), endsAt: new Date(requested.endsAt), patientFirstName: input.patientFirstName, patientLastName: input.patientLastName, patientPhone: input.patientPhone, patientEmail: input.patientEmail || null, chiefComplaint: input.chiefComplaint }).returning({ id: appointments.id });
      await transaction.insert(appointmentStatusHistory).values({ appointmentId: created.id, clinicId: context.clinicId, fromStatus: null, toStatus: 'pending', reason: 'Public online booking' });
      await writeAudit(transaction, { actorId: null, actorEmail: null, clinicId: context.clinicId, entityType: 'appointment', entityId: created.id, action: AuditAction.APPOINTMENT_CREATED, metadata: JSON.stringify({ source: 'public_booking', branchId: context.branchId, serviceId: context.serviceId, dentistId: selected.dentistId }), ipAddress: request.ipAddress, userAgent: request.userAgent });
      const notification = notifications && input.patientEmail
        ? await notifications.enqueue(transaction as unknown as DB, bookingConfirmationNotification({ clinicId: context.clinicId, patientEmail: input.patientEmail, appointmentId: created.id, clinicName: context.clinicName, branchName: context.branchName, startsAt: requested.startsAt, dedupeKey: `booking-confirmation:${created.id}` }))
        : null;
      const remindsInMs = new Date(requested.startsAt).getTime() - Date.now() - 24 * 60 * 60 * 1000;
      const reminder = notifications && input.patientEmail && remindsInMs > 0
        ? await notifications.enqueue(transaction as unknown as DB, appointmentReminderNotification({ clinicId: context.clinicId, patientEmail: input.patientEmail, appointmentId: created.id, clinicName: context.clinicName, branchName: context.branchName, startsAt: requested.startsAt, dedupeKey: `appointment-reminder:${created.id}` }))
        : null;
      const stamp = input.date.replaceAll('-', '');
      return { appointmentId: created.id, clinicId: context.clinicId, notificationId: notification?.id ?? null, reminderId: reminder?.id ?? null, reminderDelayMs: remindsInMs, confirmationNumber: `DNT-${stamp}-${created.id.slice(0, 8).toUpperCase()}`, clinicName: context.clinicName, branchName: context.branchName, serviceName: context.serviceName, dentistName: `Dr. ${selected.firstName} ${selected.lastName}`, startsAt: requested.startsAt, endsAt: requested.endsAt, status: 'pending' as const };
      });
      integrations?.dispatchEvent(result.clinicId, 'appointment.created', { appointmentId: result.appointmentId, startsAt: result.startsAt });
      if (result.notificationId) notifications?.attemptDelivery(result.notificationId);
      // Best-effort in-process timer for the common case (long-lived server);
      // processDue()'s boot-time sweep recovers it if the process restarts
      // before the timer fires. setTimeout's ~24.8-day max delay is not a
      // concern for a 24h-ahead reminder.
      if (result.reminderId && notifications) setTimeout(() => { void notifications.attemptDelivery(result.reminderId!); }, result.reminderDelayMs);
      const { clinicId: _clinicId, notificationId: _notificationId, reminderId: _reminderId, reminderDelayMs: _reminderDelayMs, ...publicResult } = result;
      return publicResult;
    },
  };
}
