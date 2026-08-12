import { index, integer, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { dentists } from './dentists';
import { appointments } from './appointments';
import { patients } from './patients';
import { patientAccounts } from './patient-portal';
import { id, timestamps } from './helpers';
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected', 'hidden']);
export const clinicReviews = pgTable('clinic_reviews', { id: id(), clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }), dentistId: uuid('dentist_id').references(() => dentists.id, { onDelete: 'set null' }), appointmentId: uuid('appointment_id').notNull().references(() => appointments.id, { onDelete: 'restrict' }), patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict' }), accountId: uuid('account_id').notNull().references(() => patientAccounts.id, { onDelete: 'restrict' }), rating: integer('rating').notNull(), comment: text('comment').notNull(), status: reviewStatusEnum('status').notNull().default('pending'), response: text('response'), responseAt: timestamp('response_at', { withTimezone: true }), moderationReason: text('moderation_reason'), moderatedBy: uuid('moderated_by'), moderatedAt: timestamp('moderated_at', { withTimezone: true }), ...timestamps }, (t) => ({ clinicIdx: index('clinic_reviews_clinic_idx').on(t.clinicId, t.status), dentistIdx: index('clinic_reviews_dentist_idx').on(t.dentistId, t.status), uniqueAppointment: unique('clinic_reviews_appointment_unique').on(t.appointmentId), patientIdx: index('clinic_reviews_patient_idx').on(t.patientId) }));
