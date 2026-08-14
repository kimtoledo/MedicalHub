import { boolean, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { id, timestamps } from './helpers';

/**
 * platform_settings — a deliberately narrow, singleton row of safe,
 * Super-Admin-editable platform defaults. NOT a generic key-value store:
 * every field is a specific, validated setting. Secrets, database
 * credentials, and arbitrary environment variables are out of scope —
 * see tasks/mvp1/25-super-admin-settings.md.
 */
export const platformSettings = pgTable('platform_settings', {
  id: id(),
  supportEmail: varchar('support_email', { length: 255 }),
  supportPhone: varchar('support_phone', { length: 50 }),
  maintenanceBannerEnabled: boolean('maintenance_banner_enabled').notNull().default(false),
  maintenanceBannerMessage: text('maintenance_banner_message'),
  updatedBy: uuid('updated_by'),
  ...timestamps,
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
