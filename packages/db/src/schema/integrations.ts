import { index, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { id, timestamps } from './helpers';

export const integrationApiKeyStatusEnum = pgEnum('integration_api_key_status', ['active', 'revoked']);
export const integrationWebhookStatusEnum = pgEnum('integration_webhook_status', ['active', 'disabled']);

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
  eventTypes: jsonb('event_types').$type<string[]>().notNull().default([]),
  status: integrationWebhookStatusEnum('status').notNull().default('active'),
  lastDeliveryAt: timestamp('last_delivery_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
  ...timestamps,
}, (t) => ({
  clinicIdx: index('integration_webhooks_clinic_idx').on(t.clinicId, t.status),
}));

export type IntegrationApiKey = typeof integrationApiKeys.$inferSelect;
export type IntegrationWebhook = typeof integrationWebhooks.$inferSelect;
