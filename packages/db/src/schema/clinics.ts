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
export const clinicVerificationStatusEnum = pgEnum('clinic_verification_status', ['unverified', 'pending', 'verified']);

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

    /**
     * Short uppercase prefix for this clinic (e.g. "SBD", "BSM").
     * Used as the leading segment of all human-readable reference IDs
     * across associated tables: patients → SBD-000001, appointments → SBD-000042.
     * Must be globally unique. 2–8 uppercase alphanumeric characters, no spaces.
     */
    prefix: varchar('prefix', { length: 8 }).notNull().default(''),
    status: clinicStatusEnum('status').notNull().default('trial'),
    publicationStatus: publicationStatusEnum('publication_status').notNull().default('draft'),
    verificationStatus: clinicVerificationStatusEnum('verification_status').notNull().default('unverified'),

    // Contact & public info
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    website: varchar('website', { length: 500 }),
    description: text('description'),
    logoUrl: varchar('logo_url', { length: 500 }),
    coverUrl: varchar('cover_url', { length: 500 }),
    heroText: varchar('hero_text', { length: 300 }),

    // Address
    address: text('address'),
    city: varchar('city', { length: 100 }),
    province: varchar('province', { length: 100 }),
    mapUrl: varchar('map_url', { length: 500 }),

    // Social
    facebookUrl: varchar('facebook_url', { length: 500 }),
    instagramUrl: varchar('instagram_url', { length: 500 }),

    themePreset: varchar('theme_preset', { length: 40 }).notNull().default('violet-clean'),
    brandAccent: varchar('brand_accent', { length: 7 }).notNull().default('#7C3AED'),
    showGallery: boolean('show_gallery').notNull().default(true),
    showTeam: boolean('show_team').notNull().default(true),
    showServices: boolean('show_services').notNull().default(true),
    seoTitle: varchar('seo_title', { length: 160 }),
    seoDescription: varchar('seo_description', { length: 320 }),
    ogImageUrl: varchar('og_image_url', { length: 1000 }),

    ...timestamps,
    ...deletedAt,
  },
  (t) => ({
    slugUnique: unique('clinics_slug_unique').on(t.slug),
    prefixUnique: unique('clinics_prefix_unique').on(t.prefix),
    statusIdx: index('clinics_status_idx').on(t.status),
  }),
);

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;
