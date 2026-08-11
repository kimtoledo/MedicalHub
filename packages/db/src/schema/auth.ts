import { index, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { id, timestamps } from './helpers';
import { users } from './users';

/** Better Auth database-backed sessions. Tokens must never be logged. */
export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: varchar('ip_address', { length: 255 }),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => ({
    tokenUnique: unique('sessions_token_unique').on(table.token),
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  }),
);

/** Better Auth identities and password/OAuth credentials. */
export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (table) => ({
    providerAccountUnique: unique('accounts_provider_account_unique').on(
      table.providerId,
      table.accountId,
    ),
    userIdIdx: index('accounts_user_id_idx').on(table.userId),
  }),
);

/** Better Auth verification tokens for future recovery/invite flows. */
export const verifications = pgTable(
  'verifications',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => ({
    identifierIdx: index('verifications_identifier_idx').on(table.identifier),
  }),
);

export type AuthSession = typeof sessions.$inferSelect;
export type AuthAccount = typeof accounts.$inferSelect;
export type AuthVerification = typeof verifications.$inferSelect;
