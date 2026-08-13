import { index, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { id, timestamps } from './helpers';

export const notificationProviderChannelEnum = pgEnum('notification_provider_channel', ['email', 'sms']);
export const notificationProviderNameEnum = pgEnum('notification_provider_name', ['sendgrid', 'twilio']);
export const notificationProviderStatusEnum = pgEnum('notification_provider_status', ['active', 'disabled']);

/**
 * A clinic's own third-party email/SMS provider account, used to actually
 * send notification-outbox rows for that clinic. credentialCiphertext is
 * encrypted (not hashed) because the server must present it to the
 * provider's API on every send — see apps/api/src/crypto/secret-box.ts.
 */
export const clinicNotificationProviders = pgTable('clinic_notification_providers', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  channel: notificationProviderChannelEnum('channel').notNull(),
  providerName: notificationProviderNameEnum('provider_name').notNull(),
  fromAddress: varchar('from_address', { length: 320 }).notNull(),
  credentialCiphertext: text('credential_ciphertext').notNull(),
  status: notificationProviderStatusEnum('status').notNull().default('active'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  lastError: text('last_error'),
  ...timestamps,
}, (t) => ({
  clinicChannelUnique: unique('clinic_notification_providers_clinic_channel_unique').on(t.clinicId, t.channel),
  clinicIdx: index('clinic_notification_providers_clinic_idx').on(t.clinicId),
}));

export type ClinicNotificationProvider = typeof clinicNotificationProviders.$inferSelect;
