import { boolean, index, pgEnum, pgTable, text, unique, varchar } from 'drizzle-orm/pg-core';
import { id, timestamps, deletedAt } from './helpers';

export const clinicStatusEnum = pgEnum('clinic_status', [
  'trial',
  'active',
  'suspended',
  'archived',
]);

export const publicationStatusEnum = pgEnum('publication_status', [
  'draft',
  'published',
  'unpublished',
]);

/**
 * clinics — top-level tenant entity.
 * One clinic can have many branches.
 * All tenant-scoped records reference clinic_id.
 */
export const clinics = pgTable(
  'clinics',
  {
    id: id(),
    name: varchar('name', { length: 200 }).notNull(),
    /** URL slug — must be globally unique */
    slug: varchar('slug', { length: 80 }).notNull(),
    status: clinicStatusEnum('status').notNull().default('trial'),
    publicationStatus: publicationStatusEnum('publication_status').notNull().default('draft'),

    // Contact & public info
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    website: varchar('website', { length: 500 }),
    description: text('description'),
    logoUrl: varchar('logo_url', { length: 500 }),
    coverUrl: varchar('cover_url', { length: 500 }),

    // Address
    address: text('address'),
    city: varchar('city', { length: 100 }),
    province: varchar('province', { length: 100 }),
    mapUrl: varchar('map_url', { length: 500 }),

    // Social
    facebookUrl: varchar('facebook_url', { length: 500 }),
    instagramUrl: varchar('instagram_url', { length: 500 }),

    ...timestamps,
    ...deletedAt,
  },
  (t) => ({
    slugUnique: unique('clinics_slug_unique').on(t.slug),
    statusIdx: index('clinics_status_idx').on(t.status),
  }),
);

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;
