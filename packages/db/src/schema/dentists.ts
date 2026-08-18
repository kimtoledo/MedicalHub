import { index, pgEnum, pgTable, text, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { clinics } from './clinics';
import { id, timestamps, deletedAt } from './helpers';

export const verificationStatusEnum = pgEnum('verification_status', [
  'unverified',
  'pending',
  'verified',
]);

/**
 * dentists — independent dentist profiles.
 * A dentist exists at platform level; affiliation to branches is via
 * dentist_branch_assignments. A dentist may have zero clinic ownership.
 */
export const dentists = pgTable(
  'dentists',
  {
    id: id(),
    /** Globally unique slug for public profile: /dentists/[slug] */
    slug: varchar('slug', { length: 80 }).notNull(),

    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    /** PRC license number */
    licenseNumber: varchar('license_number', { length: 50 }),
    specialty: varchar('specialty', { length: 200 }),
    bio: text('bio'),

    photoUrl: varchar('photo_url', { length: 500 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),

    /**
     * Base64 data-URL of the dentist's drawn or uploaded signature image.
     * Stored as text since base64 signatures can exceed 500 chars.
     */
    signatureUrl: text('signature_url'),

    /**
     * Preferred prescription template: 'classic' | 'modern' | 'minimal'.
     * Defaults to 'classic'.
     */
    templateId: varchar('template_id', { length: 20 }).notNull().default('classic'),

    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('unverified'),
    publicationStatus: varchar('publication_status', { length: 20 })
      .notNull()
      .default('draft'),

    ...timestamps,
    ...deletedAt,
  },
  (t) => ({
    slugUnique: unique('dentists_slug_unique').on(t.slug),
    licenseNumberUnique: unique('dentists_license_number_unique').on(t.licenseNumber),
    publicationIdx: index('dentists_publication_idx').on(t.publicationStatus),
  }),
);

/**
 * dentist_branch_assignments — many-to-many between dentists and branches.
 * A dentist can work at multiple clinic branches.
 * Tenant isolation: each row is scoped to a clinic via clinic_id.
 */
export const dentistBranchAssignments = pgTable(
  'dentist_branch_assignments',
  {
    id: id(),
    dentistId: uuid('dentist_id')
      .notNull()
      .references(() => dentists.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    /** Denormalized for fast tenant-scoped queries */
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
    ...timestamps,
  },
  (t) => ({
    dentistIdx: index('dba_dentist_id_idx').on(t.dentistId),
    branchIdx: index('dba_branch_id_idx').on(t.branchId),
    clinicIdx: index('dba_clinic_id_idx').on(t.clinicId),
  }),
);

export type Dentist = typeof dentists.$inferSelect;
export type NewDentist = typeof dentists.$inferInsert;
export type DentistBranchAssignment = typeof dentistBranchAssignments.$inferSelect;
