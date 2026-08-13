import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { id, timestamps } from './helpers';

export const integrationApiKeyStatusEnum = pgEnum('integration_api_key_status', ['active', 'revoked']);
export const integrationWebhookStatusEnum = pgEnum('integration_webhook_status', ['active', 'disabled']);
export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', ['queued', 'delivered', 'failed']);

export const integrationApiKeys = pgTable('integration_api_keys', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 24 }).notNull(),
  keyHash: varchar('key_hash', { length: 64 }).notNull(),
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
  status: integrationApiKeyStatusEnum('status').notNull().default('active'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ...timestamps,
}, (t) => ({
  keyHashUnique: unique('integration_api_key_hash_unique').on(t.keyHash),
  clinicIdx: index('integration_api_keys_clinic_idx').on(t.clinicId, t.status),
}));

export const integrationWebhooks = pgTable('integration_webhooks', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  endpointUrl: varchar('endpoint_url', { length: 500 }).notNull(),
  secretHash: varchar('secret_hash', { length: 64 }).notNull(),
  /**
   * Encrypted (not just hashed) copy of the signing secret. Outbound
   * deliveries must SIGN each payload, which requires the plaintext secret —
   * a one-way hash (secretHash, kept for the one-time-reveal audit trail)
   * cannot be used for that. Null for webhooks created before this column
   * existed; those cannot be signed and delivery fails with a clear reason
   * until the clinic recreates the webhook.
   */
  secretCiphertext: text('secret_ciphertext'),
  eventTypes: jsonb('event_types').$type<string[]>().notNull().default([]),
  status: integrationWebhookStatusEnum('status').notNull().default('active'),
  lastDeliveryAt: timestamp('last_delivery_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
  ...timestamps,
}, (t) => ({
  clinicIdx: index('integration_webhooks_clinic_idx').on(t.clinicId, t.status),
}));

export const integrationWebhookDeliveries = pgTable('integration_webhook_deliveries', {
  id: id(),
  webhookId: uuid('webhook_id').notNull().references(() => integrationWebhooks.id, { onDelete: 'cascade' }),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: text('payload').notNull(),
  status: webhookDeliveryStatusEnum('status').notNull().default('queued'),
  attempts: integer('attempts').notNull().default(0),
  responseStatus: integer('response_status'),
  lastError: text('last_error'),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  ...timestamps,
}, (t) => ({
  webhookIdx: index('integration_webhook_deliveries_webhook_idx').on(t.webhookId, t.status),
  dueIdx: index('integration_webhook_deliveries_due_idx').on(t.status, t.nextAttemptAt),
}));

export type IntegrationApiKey = typeof integrationApiKeys.$inferSelect;
export type IntegrationWebhook = typeof integrationWebhooks.$inferSelect;
export type IntegrationWebhookDelivery = typeof integrationWebhookDeliveries.$inferSelect;
