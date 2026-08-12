import { boolean, index, numeric, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { uuid } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { id, timestamps, deletedAt } from './helpers';

/**
 * branches — physical locations belonging to a clinic.
 * All appointments and memberships reference a branch.
 */
export const branches = pgTable(
  'branches',
  {
    id: id(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),

    name: varchar('name', { length: 200 }).notNull(),
    isMain: boolean('is_main').notNull().default(false),

    // Contact
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),

    // Address
    address: text('address'),
    city: varchar('city', { length: 100 }),
    province: varchar('province', { length: 100 }),
    mapUrl: varchar('map_url', { length: 500 }),
    latitude: numeric('latitude', { precision: 9, scale: 6 }),
    longitude: numeric('longitude', { precision: 9, scale: 6 }),
    /** JSON object keyed by weekday with public opening-hour labels. */
    operatingHours: text('operating_hours'),

    isActive: boolean('is_active').notNull().default(true),

    ...timestamps,
    ...deletedAt,
  },
  (t) => ({
    clinicIdx: index('branches_clinic_id_idx').on(t.clinicId),
  }),
);

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
