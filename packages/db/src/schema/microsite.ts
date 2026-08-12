import { boolean, index, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { id, timestamps } from './helpers';

export const clinicGalleryItems = pgTable('clinic_gallery_items', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  imageUrl: varchar('image_url', { length: 1000 }).notNull(),
  altText: varchar('alt_text', { length: 200 }).notNull(),
  caption: text('caption'),
  sortOrder: varchar('sort_order', { length: 10 }).notNull().default('0'),
  isPublished: boolean('is_published').notNull().default(true),
  ...timestamps,
}, (t) => ({ clinicIdx: index('clinic_gallery_clinic_idx').on(t.clinicId) }));

export type ClinicGalleryItem = typeof clinicGalleryItems.$inferSelect;
