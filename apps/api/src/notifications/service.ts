import { and, asc, eq, lte } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { notificationOutbox } from '@dentra/db/schema';
import type { NotificationProvidersService } from './providers-service.js';

export type NotificationInput = { clinicId?: string | null; channel: 'email' | 'sms'; type: 'booking_confirmation' | 'appointment_reminder' | 'appointment_cancelled' | 'appointment_rescheduled' | 'recall_reminder'; recipient: string; subject: string; body: string; dedupeKey: string; nextAttemptAt?: Date };

const safeContent = (input: NotificationInput) => ({ ...input, subject: input.subject.slice(0, 300), body: input.body.slice(0, 2000) });
const MAX_ATTEMPTS = 5;

export type NotificationService = {
  enqueue: (database: DB, input: NotificationInput) => Promise<{ id: string; duplicate: boolean }>;
  /** Attempts one queued row now — fire-and-forget after a caller's own transaction commits. Never awaited for its result by callers on the critical path. */
  attemptDelivery: (id: string) => Promise<void>;
  /** Drains anything left queued past its retry time — meant for a boot-time sweep after a process restart interrupts in-memory retry timers. */
  processDue: (limit?: number) => Promise<{ processed: number; sent: number; failed: number }>;
};

/**
 * Notifications are only ever actually sent through a clinic's own connected
 * provider (see providers-service.ts) — there is no platform-wide fallback.
 * A row for a clinic with no provider configured fails with a clear reason
 * instead of being silently marked "sent" with nothing having gone out.
 */
export function createNotificationService(database: DB, providers?: NotificationProvidersService): NotificationService {
  async function deliver(row: { id: string; clinicId: string | null; channel: 'email' | 'sms'; recipient: string; subject: string; body: string; attempts: string }) {
    try {
      if (!row.clinicId || !providers) throw new Error('No clinic-connected provider is configured for this notification');
      await providers.send(row.clinicId, row.channel, row.recipient, row.subject, row.body);
      await database.update(notificationOutbox).set({ status: 'sent', sentAt: new Date(), attempts: String(Number(row.attempts) + 1) }).where(eq(notificationOutbox.id, row.id));
      return true;
    } catch (caught) {
      const attempts = Number(row.attempts) + 1;
      const permanent = attempts >= MAX_ATTEMPTS;
      await database.update(notificationOutbox).set({ status: permanent ? 'failed' : 'queued', attempts: String(attempts), lastError: caught instanceof Error ? caught.message.slice(0, 500) : 'Provider error', nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000) }).where(eq(notificationOutbox.id, row.id));
      if (!permanent) setTimeout(() => { void attemptDelivery(row.id); }, Math.min(60, 2 ** attempts) * 60_000);
      return false;
    }
  }
  async function attemptDelivery(id: string) {
    const [row] = await database.select({ id: notificationOutbox.id, clinicId: notificationOutbox.clinicId, channel: notificationOutbox.channel, recipient: notificationOutbox.recipient, subject: notificationOutbox.subject, body: notificationOutbox.body, attempts: notificationOutbox.attempts, status: notificationOutbox.status }).from(notificationOutbox).where(eq(notificationOutbox.id, id)).limit(1);
    if (!row || row.status !== 'queued') return;
    await deliver(row);
  }
  return {
    enqueue: async (db, input) => {
      const value = safeContent(input);
      const [existing] = await db.select({ id: notificationOutbox.id }).from(notificationOutbox).where(eq(notificationOutbox.dedupeKey, value.dedupeKey)).limit(1);
      if (existing) return { id: existing.id, duplicate: true };
      const [created] = await db.insert(notificationOutbox).values({ ...value, clinicId: value.clinicId ?? null, ...(value.nextAttemptAt ? { nextAttemptAt: value.nextAttemptAt } : {}) }).returning({ id: notificationOutbox.id });
      return { id: created.id, duplicate: false };
    },
    attemptDelivery,
    processDue: async (limit = 50) => {
      const rows = await database.select({ id: notificationOutbox.id, clinicId: notificationOutbox.clinicId, channel: notificationOutbox.channel, recipient: notificationOutbox.recipient, subject: notificationOutbox.subject, body: notificationOutbox.body, attempts: notificationOutbox.attempts }).from(notificationOutbox).where(and(eq(notificationOutbox.status, 'queued'), lte(notificationOutbox.nextAttemptAt, new Date()))).orderBy(asc(notificationOutbox.nextAttemptAt)).limit(limit);
      let sent = 0; let failed = 0;
      for (const row of rows) { if (await deliver(row)) sent++; else failed++; }
      return { processed: rows.length, sent, failed };
    },
  };
}

export function bookingConfirmationNotification(input: { clinicId: string; patientEmail: string; appointmentId: string; clinicName: string; branchName: string; startsAt: string; dedupeKey: string }): NotificationInput {
  const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(input.startsAt));
  return { clinicId: input.clinicId, channel: 'email', type: 'booking_confirmation', recipient: input.patientEmail, subject: `Appointment request received — ${input.clinicName}`, body: `Your appointment request with ${input.clinicName} has been received. Location: ${input.branchName}. Date and time: ${date}. Please contact the clinic if you need to make changes.`, dedupeKey: input.dedupeKey };
}

/**
 * Scheduled 24h before the appointment via `nextAttemptAt` — reuses the
 * SAME `nextAttemptAt <= now()` filter processDue() already applies, no
 * new scheduling column needed. Callers should also arrange an in-process
 * setTimeout for the common case (long-lived process); processDue()'s
 * boot-time sweep is the fallback if the process restarts before then.
 */
export function appointmentReminderNotification(input: { clinicId: string; patientEmail: string; appointmentId: string; clinicName: string; branchName: string; startsAt: string; dedupeKey: string }): NotificationInput {
  const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(input.startsAt));
  const remindAt = new Date(new Date(input.startsAt).getTime() - 24 * 60 * 60 * 1000);
  return { clinicId: input.clinicId, channel: 'email', type: 'appointment_reminder', recipient: input.patientEmail, subject: `Reminder: upcoming appointment — ${input.clinicName}`, body: `This is a reminder of your upcoming appointment with ${input.clinicName} at ${input.branchName} on ${date}. Please contact the clinic if you need to reschedule.`, dedupeKey: input.dedupeKey, nextAttemptAt: remindAt };
}

export function appointmentCancelledNotification(input: { clinicId: string; patientEmail: string; appointmentId: string; clinicName: string; branchName: string; startsAt: string; dedupeKey: string }): NotificationInput {
  const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(input.startsAt));
  return { clinicId: input.clinicId, channel: 'email', type: 'appointment_cancelled', recipient: input.patientEmail, subject: `Appointment cancelled — ${input.clinicName}`, body: `Your appointment with ${input.clinicName} at ${input.branchName} on ${date} has been cancelled. Please contact the clinic if you'd like to reschedule.`, dedupeKey: input.dedupeKey };
}

/**
 * Not yet wired to any actual "move this appointment" action — this
 * codebase currently only lets a patient submit an appointment_reschedule
 * REQUEST for clinic staff to review manually; there is no automated flow
 * that changes an appointment's startsAt/endsAt yet. Exported ready for
 * whichever future code path actually performs that move.
 */
export function appointmentRescheduledNotification(input: { clinicId: string; patientEmail: string; appointmentId: string; clinicName: string; branchName: string; startsAt: string; dedupeKey: string }): NotificationInput {
  const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(input.startsAt));
  return { clinicId: input.clinicId, channel: 'email', type: 'appointment_rescheduled', recipient: input.patientEmail, subject: `Appointment rescheduled — ${input.clinicName}`, body: `Your appointment with ${input.clinicName} at ${input.branchName} has been rescheduled to ${date}. Please contact the clinic if this doesn't work for you.`, dedupeKey: input.dedupeKey };
}
