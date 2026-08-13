import { and, asc, eq, gt, inArray, isNull, lt, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import {
  appointments,
  appointmentStatusHistory,
  branches,
  clinics,
  dentistBranchAssignments,
  dentists,
  services,
} from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';
import type { NotificationService } from '../notifications/service.js';
import { bookingConfirmationNotification } from '../notifications/service.js';
import type { IntegrationService } from '../integrations/service.js';

const MANILA_OFFSET = '+08:00';
const activeStatuses = ['pending', 'confirmed', 'checked_in', 'in_progress'] as const;
const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

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
  availability: (input: AvailabilityInput) => Promise<{ date: string; durationMinutes: number; slots: AvailableSlot[] }>;
  book: (input: PublicBookingInput, request: { ipAddress?: string; userAgent?: string }) => Promise<PublicBookingResult>;
};

export class PublicBookingError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode = 400) { super(message); }
}

export function parseHours(value: string | null, date: string): [number, number] | null {
  const day = dayNames[new Date(`${date}T12:00:00${MANILA_OFFSET}`).getUTCDay()];
  let label: string | undefined;
  if (value) {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      if (typeof parsed[day] === 'string') label = parsed[day] as string;
    } catch { /* Invalid legacy content falls back to standard hours. */ }
  }
  if (!label) return day === 'sunday' ? null : [9 * 60, 17 * 60];
  if (/closed/i.test(label)) return null;
  const normalized = label.replace(/[–—]/g, '-').trim();
  const parts = normalized.split(/\s*-\s*/);
  if (parts.length !== 2) return null;
  const parsePart = (part: string): number | null => {
    const match = part.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return null;
    let hour = Number(match[1]); const minute = Number(match[2] ?? 0); const period = match[3]?.toLowerCase();
    if (minute > 59 || hour > (period ? 12 : 23) || hour < (period ? 1 : 0)) return null;
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    return hour * 60 + minute;
  };
  const start = parsePart(parts[0]); const end = parsePart(parts[1]);
  return start !== null && end !== null && end > start ? [start, end] : null;
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

export function generatedSlots(hours: [number, number] | null, date: string, durationMinutes: number): AvailableSlot[] {
  if (!hours) return [];
  const result: AvailableSlot[] = [];
  for (let cursor = hours[0]; cursor + durationMinutes <= hours[1]; cursor += 30) {
    const start = instant(date, cursor); const end = instant(date, cursor + durationMinutes);
    if (start.getTime() > Date.now()) result.push({ startsAt: start.toISOString(), endsAt: end.toISOString() });
  }
  return result;
}

export function overlaps(slot: AvailableSlot, busy: Array<{ startsAt: Date; endsAt: Date | null }>): boolean {
  const start = new Date(slot.startsAt).getTime(); const end = new Date(slot.endsAt).getTime();
  return busy.some((item) => item.startsAt.getTime() < end && (item.endsAt?.getTime() ?? Number.POSITIVE_INFINITY) > start);
}

export function createPublicBookingService(database: DB, notifications?: NotificationService, integrations?: IntegrationService): PublicBookingService {
  const loadContext = async (input: AvailabilityInput) => {
    const [context] = await database.select({ clinicId: clinics.id, clinicName: clinics.name, branchId: branches.id, branchName: branches.name, operatingHours: branches.operatingHours, serviceId: services.id, serviceName: services.name, durationMinutes: services.durationMinutes })
      .from(clinics).innerJoin(branches, eq(branches.clinicId, clinics.id)).innerJoin(services, eq(services.clinicId, clinics.id))
      .where(and(eq(clinics.slug, input.clinicSlug), eq(clinics.publicationStatus, 'published'), inArray(clinics.status, ['trial', 'active']), isNull(clinics.deletedAt), eq(branches.id, input.branchId), eq(branches.isActive, true), isNull(branches.deletedAt), eq(services.id, input.serviceId), eq(services.isActive, 'true'), eq(services.isBookable, true))).limit(1);
    if (!context) throw new PublicBookingError('BOOKING_CONTEXT_UNAVAILABLE', 'The selected clinic, branch, or service is unavailable', 404);
    const assignments = await database.select({ assignmentId: dentistBranchAssignments.id, dentistId: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName })
      .from(dentistBranchAssignments).innerJoin(dentists, eq(dentistBranchAssignments.dentistId, dentists.id))
      .where(and(eq(dentistBranchAssignments.clinicId, context.clinicId), eq(dentistBranchAssignments.branchId, context.branchId), eq(dentistBranchAssignments.isActive, 'true'), input.dentistId ? eq(dentists.id, input.dentistId) : undefined, eq(dentists.verificationStatus, 'verified'), eq(dentists.publicationStatus, 'published'), isNull(dentists.deletedAt))).orderBy(asc(dentists.lastName), asc(dentists.firstName));
    if (!assignments.length) throw new PublicBookingError('DENTIST_UNAVAILABLE', 'No active dentist is available for this selection', 404);
    return { context, assignments };
  };

  return {
    availability: async (input) => {
      const { context, assignments } = await loadContext(input); const minutes = duration(context.durationMinutes);
      const slots = generatedSlots(parseHours(context.operatingHours, input.date), input.date, minutes);
      if (!slots.length) return { date: input.date, durationMinutes: minutes, slots: [] };
      const dayStart = instant(input.date, 0); const dayEnd = instant(input.date, 24 * 60);
      const busy = await database.select({ dentistId: appointments.dentistId, startsAt: appointments.startsAt, endsAt: appointments.endsAt }).from(appointments).where(and(inArray(appointments.dentistId, assignments.map((item) => item.dentistId)), inArray(appointments.status, [...activeStatuses]), lt(appointments.startsAt, dayEnd), or(isNull(appointments.endsAt), gt(appointments.endsAt, dayStart))));
      const available = slots.filter((slot) => assignments.some((assignment) => !overlaps(slot, busy.filter((item) => item.dentistId === assignment.dentistId))));
      return { date: input.date, durationMinutes: minutes, slots: available };
    },
    book: async (input, request) => {
      const result = await database.transaction(async (transaction) => {
      const [context] = await transaction.select({ clinicId: clinics.id, clinicName: clinics.name, branchId: branches.id, branchName: branches.name, operatingHours: branches.operatingHours, serviceId: services.id, serviceName: services.name, durationMinutes: services.durationMinutes })
        .from(clinics).innerJoin(branches, eq(branches.clinicId, clinics.id)).innerJoin(services, eq(services.clinicId, clinics.id))
        .where(and(eq(clinics.slug, input.clinicSlug), eq(clinics.publicationStatus, 'published'), inArray(clinics.status, ['trial', 'active']), isNull(clinics.deletedAt), eq(branches.id, input.branchId), eq(branches.isActive, true), isNull(branches.deletedAt), eq(services.id, input.serviceId), eq(services.isActive, 'true'), eq(services.isBookable, true))).limit(1);
      if (!context) throw new PublicBookingError('BOOKING_CONTEXT_UNAVAILABLE', 'The selected clinic, branch, or service is unavailable', 404);
      const minutes = duration(context.durationMinutes); const validSlots = generatedSlots(parseHours(context.operatingHours, input.date), input.date, minutes);
      const requested = validSlots.find((slot) => slot.startsAt === new Date(input.startsAt).toISOString());
      if (!requested) throw new PublicBookingError('INVALID_SLOT', 'The selected time is outside current operating hours or is in the past');
      const candidates = await transaction.select({ assignmentId: dentistBranchAssignments.id, dentistId: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName })
        .from(dentistBranchAssignments).innerJoin(dentists, eq(dentistBranchAssignments.dentistId, dentists.id))
        .where(and(eq(dentistBranchAssignments.clinicId, context.clinicId), eq(dentistBranchAssignments.branchId, context.branchId), eq(dentistBranchAssignments.isActive, 'true'), input.dentistId ? eq(dentists.id, input.dentistId) : undefined, eq(dentists.verificationStatus, 'verified'), eq(dentists.publicationStatus, 'published'), isNull(dentists.deletedAt))).orderBy(asc(dentists.lastName), asc(dentists.firstName)).for('update');
      if (!candidates.length) throw new PublicBookingError('DENTIST_UNAVAILABLE', 'The selected dentist is no longer available', 409);
      let selected: typeof candidates[number] | undefined;
      for (const candidate of candidates) {
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
      const stamp = input.date.replaceAll('-', '');
      return { appointmentId: created.id, clinicId: context.clinicId, notificationId: notification?.id ?? null, confirmationNumber: `DNT-${stamp}-${created.id.slice(0, 8).toUpperCase()}`, clinicName: context.clinicName, branchName: context.branchName, serviceName: context.serviceName, dentistName: `Dr. ${selected.firstName} ${selected.lastName}`, startsAt: requested.startsAt, endsAt: requested.endsAt, status: 'pending' as const };
      });
      integrations?.dispatchEvent(result.clinicId, 'appointment.created', { appointmentId: result.appointmentId, startsAt: result.startsAt });
      if (result.notificationId) notifications?.attemptDelivery(result.notificationId);
      const { clinicId: _clinicId, notificationId: _notificationId, ...publicResult } = result;
      return publicResult;
    },
  };
}
