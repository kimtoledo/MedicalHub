import { and, asc, eq, lte } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { notificationOutbox } from '@dentra/db/schema';
import type { NotificationProvidersService } from './providers-service.js';

export type NotificationInput = { clinicId?: string | null; channel: 'email' | 'sms'; type: 'booking_confirmation' | 'appointment_reminder' | 'appointment_cancelled' | 'appointment_rescheduled' | 'recall_reminder'; recipient: string; subject: string; body: string; dedupeKey: string };

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
      const [created] = await db.insert(notificationOutbox).values({ ...value, clinicId: value.clinicId ?? null }).returning({ id: notificationOutbox.id });
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
