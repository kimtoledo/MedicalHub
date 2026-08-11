import { boolean, index, pgEnum, pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { clinics } from './clinics';
import { dentists } from './dentists';
import { id, timestamps, deletedAt } from './helpers';

export const platformRoleEnum = pgEnum('platform_role', [
  'super_admin',
  'platform_support',
]);

export const clinicRoleEnum = pgEnum('clinic_role', [
  'clinic_owner',
  'clinic_admin',
  'dentist',
  'receptionist',
  'dental_assistant',
  'cashier',
  'inventory_staff',
]);

/**
 * users — authentication identity, managed by the auth library.
 * This table stores app-level user data; auth credentials live in the
 * auth provider's own tables (e.g. Better Auth sessions/accounts).
 */
export const users = pgTable(
  'users',
  {
    id: id(),
    name: varchar('name', { length: 200 }).notNull().default(''),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    phone: varchar('phone', { length: 20 }),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    /** Platform-level role; NULL for ordinary clinic staff */
    platformRole: platformRoleEnum('platform_role'),
    isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
    ...timestamps,
    ...deletedAt,
  },
  (t) => ({
    emailUnique: unique('users_email_unique').on(t.email),
    platformRoleIdx: index('users_platform_role_idx').on(t.platformRole),
  }),
);

/**
 * clinic_memberships — a user's role within a specific clinic.
 * Tenant scope is always derived from this table server-side;
 * never trust client-supplied clinic_id or role.
 */
export const clinicMemberships = pgTable(
  'clinic_memberships',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    /** NULL means membership applies to all branches in the clinic */
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    role: clinicRoleEnum('role').notNull(),
    /** If this user is also a dentist profile */
    dentistId: uuid('dentist_id').references(() => dentists.id),
    isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
    invitedAt: varchar('invited_at', { length: 50 }),
    joinedAt: varchar('joined_at', { length: 50 }),
    ...timestamps,
  },
  (t) => ({
    userClinicIdx: index('memberships_user_clinic_idx').on(t.userId, t.clinicId),
    clinicIdx: index('memberships_clinic_id_idx').on(t.clinicId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ClinicMembership = typeof clinicMemberships.$inferSelect;
