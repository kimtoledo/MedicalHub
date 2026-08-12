import { boolean, index, pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinicMemberships } from './users';
import { clinics } from './clinics';
import { id, timestamps } from './helpers';

export const clinicMembershipPermissions = pgTable('clinic_membership_permissions', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  membershipId: uuid('membership_id').notNull().references(() => clinicMemberships.id, { onDelete: 'cascade' }),
  permissionKey: varchar('permission_key', { length: 100 }).notNull(),
  isEnabled: boolean('is_enabled').notNull(),
  updatedBy: uuid('updated_by'),
  ...timestamps,
}, (t) => ({ membershipIdx: index('membership_permissions_membership_idx').on(t.membershipId), clinicIdx: index('membership_permissions_clinic_idx').on(t.clinicId), uniquePermission: unique('membership_permission_unique').on(t.membershipId, t.permissionKey) }));

export type ClinicMembershipPermission = typeof clinicMembershipPermissions.$inferSelect;
