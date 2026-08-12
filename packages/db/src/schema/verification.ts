import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { dentists } from './dentists';
import { id, timestamps } from './helpers';
export const verificationSubjectEnum = pgEnum('verification_subject', ['dentist', 'clinic']);
export const verificationSubmissionStatusEnum = pgEnum('verification_submission_status', ['pending', 'approved', 'rejected', 'revoked']);
export const verificationSubmissions = pgTable('verification_submissions', { id: id(), subjectType: verificationSubjectEnum('subject_type').notNull(), dentistId: uuid('dentist_id').references(() => dentists.id, { onDelete: 'cascade' }), clinicId: uuid('clinic_id').references(() => clinics.id, { onDelete: 'cascade' }), documents: text('documents').notNull(), status: verificationSubmissionStatusEnum('status').notNull().default('pending'), submittedBy: uuid('submitted_by').notNull(), reviewedBy: uuid('reviewed_by'), reviewReason: text('review_reason'), expiresAt: timestamp('expires_at', { withTimezone: true }), reviewedAt: timestamp('reviewed_at', { withTimezone: true }), ...timestamps }, (t) => ({ dentistIdx: index('verification_dentist_idx').on(t.dentistId, t.status), clinicIdx: index('verification_clinic_idx').on(t.clinicId, t.status), statusIdx: index('verification_status_idx').on(t.status) }));
