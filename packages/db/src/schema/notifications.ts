import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { id, timestamps } from './helpers';

export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'sms']);
export const notificationStatusEnum = pgEnum('notification_status', ['held', 'queued', 'processing', 'sent', 'failed', 'cancelled']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'booking_confirmation',
  'appointment_reminder',
  'appointment_cancelled',
  'appointment_rescheduled',
  'recall_reminder',
  'prescription_share',
  'dentist_verification_approved',
  'dentist_verification_rejected',
  'dentist_verification_revoked',
]);

export const notificationOutbox = pgTable('notification_outbox', {
  id: id(),
  clinicId: uuid('clinic_id').references(() => clinics.id, { onDelete: 'set null' }),
  channel: notificationChannelEnum('channel').notNull(),
  type: notificationTypeEnum('type').notNull(),
  recipient: varchar('recipient', { length: 320 }).notNull(),
  subject: varchar('subject', { length: 300 }).notNull(),
  body: text('body').notNull(),
  dedupeKey: varchar('dedupe_key', { length: 300 }).notNull().unique(),
  status: notificationStatusEnum('status').notNull().default('queued'),
  attempts: varchar('attempts', { length: 10 }).notNull().default('0'),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  lastError: text('last_error'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  ...timestamps,
}, (t) => ({ statusIdx: index('notification_outbox_status_idx').on(t.status, t.nextAttemptAt), clinicIdx: index('notification_outbox_clinic_idx').on(t.clinicId), typeIdx: index('notification_outbox_type_idx').on(t.type) }));

export type NotificationOutbox = typeof notificationOutbox.$inferSelect;
