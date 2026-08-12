import { and, asc, eq, lte } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { notificationOutbox } from '@dentra/db/schema';

export type NotificationInput = { clinicId?: string | null; channel: 'email' | 'sms'; type: 'booking_confirmation' | 'appointment_reminder' | 'appointment_cancelled' | 'appointment_rescheduled' | 'recall_reminder'; recipient: string; subject: string; body: string; dedupeKey: string };
export type NotificationProvider = { send: (input: { channel: 'email' | 'sms'; recipient: string; subject: string; body: string }) => Promise<void> };

const safeContent = (input: NotificationInput) => ({ ...input, subject: input.subject.slice(0, 300), body: input.body.slice(0, 2000) });

export type NotificationService = { enqueue: (database: DB, input: NotificationInput) => Promise<{ id: string; duplicate: boolean }>; processDue: (limit?: number) => Promise<{ processed: number; sent: number; failed: number }> };

export function createNotificationService(database: DB, provider: NotificationProvider = { send: async () => undefined }): NotificationService {
  return {
    enqueue: async (db, input) => {
      const value = safeContent(input);
      const [existing] = await db.select({ id: notificationOutbox.id }).from(notificationOutbox).where(eq(notificationOutbox.dedupeKey, value.dedupeKey)).limit(1);
      if (existing) return { id: existing.id, duplicate: true };
      const [created] = await db.insert(notificationOutbox).values({ ...value, clinicId: value.clinicId ?? null }).returning({ id: notificationOutbox.id });
      return { id: created.id, duplicate: false };
    },
    processDue: async (limit = 50) => {
      const rows = await database.select({ id: notificationOutbox.id, channel: notificationOutbox.channel, recipient: notificationOutbox.recipient, subject: notificationOutbox.subject, body: notificationOutbox.body, attempts: notificationOutbox.attempts }).from(notificationOutbox).where(and(eq(notificationOutbox.status, 'queued'), lte(notificationOutbox.nextAttemptAt, new Date()))).orderBy(asc(notificationOutbox.nextAttemptAt)).limit(limit);
      let sent = 0; let failed = 0;
      for (const row of rows) {
        try {
          await provider.send({ channel: row.channel, recipient: row.recipient, subject: row.subject, body: row.body });
          await database.update(notificationOutbox).set({ status: 'sent', sentAt: new Date(), attempts: String(Number(row.attempts) + 1) }).where(eq(notificationOutbox.id, row.id)); sent++;
        } catch (caught) {
          const attempts = Number(row.attempts) + 1;
          await database.update(notificationOutbox).set({ status: attempts >= 5 ? 'failed' : 'queued', attempts: String(attempts), lastError: caught instanceof Error ? caught.message.slice(0, 500) : 'Provider error', nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000) }).where(eq(notificationOutbox.id, row.id)); failed++;
        }
      }
      return { processed: rows.length, sent, failed };
    },
  };
}

export function bookingConfirmationNotification(input: { clinicId: string; patientEmail: string; appointmentId: string; clinicName: string; branchName: string; startsAt: string; dedupeKey: string }): NotificationInput {
  const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(input.startsAt));
  return { clinicId: input.clinicId, channel: 'email', type: 'booking_confirmation', recipient: input.patientEmail, subject: `Appointment request received — ${input.clinicName}`, body: `Your appointment request with ${input.clinicName} has been received. Location: ${input.branchName}. Date and time: ${date}. Please contact the clinic if you need to make changes.`, dedupeKey: input.dedupeKey };
}
