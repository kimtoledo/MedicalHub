import { boolean, index, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { appointments } from './appointments';
import { id, timestamps } from './helpers';

export const patientAccountStatusEnum = pgEnum('patient_account_status', ['active', 'suspended']);
export const patientPortalRequestTypeEnum = pgEnum('patient_portal_request_type', ['contact_update', 'appointment_cancel', 'appointment_reschedule']);
export const patientPortalRequestStatusEnum = pgEnum('patient_portal_request_status', ['pending', 'approved', 'rejected']);

export const patientAccounts = pgTable('patient_accounts', {
  id: id(), email: varchar('email', { length: 255 }), phone: varchar('phone', { length: 20 }), passwordHash: text('password_hash').notNull(), status: patientAccountStatusEnum('status').notNull().default('active'), ...timestamps,
}, (t) => ({ emailIdx: index('patient_accounts_email_idx').on(t.email), phoneIdx: index('patient_accounts_phone_idx').on(t.phone) }));

export const patientPortalSessions = pgTable('patient_portal_sessions', {
  id: id(), accountId: uuid('account_id').notNull().references(() => patientAccounts.id, { onDelete: 'cascade' }), tokenHash: varchar('token_hash', { length: 128 }).notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), ...timestamps,
}, (t) => ({ tokenUnique: unique('patient_portal_session_token_unique').on(t.tokenHash), accountIdx: index('patient_portal_session_account_idx').on(t.accountId), expiryIdx: index('patient_portal_session_expiry_idx').on(t.expiresAt) }));

export const patientPortalLinks = pgTable('patient_portal_links', {
  id: id(), accountId: uuid('account_id').notNull().references(() => patientAccounts.id, { onDelete: 'cascade' }), clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }), patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }), consentedAt: timestamp('consented_at', { withTimezone: true }).notNull(), revokedAt: timestamp('revoked_at', { withTimezone: true }), ...timestamps,
}, (t) => ({ accountIdx: index('patient_portal_link_account_idx').on(t.accountId), clinicIdx: index('patient_portal_link_clinic_idx').on(t.clinicId), uniqueLink: unique('patient_portal_account_patient_unique').on(t.accountId, t.patientId) }));

export const patientPortalRequests = pgTable('patient_portal_requests', {
  id: id(), accountId: uuid('account_id').notNull().references(() => patientAccounts.id, { onDelete: 'cascade' }), clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }), patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }), appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }), type: patientPortalRequestTypeEnum('type').notNull(), payload: text('payload').notNull(), status: patientPortalRequestStatusEnum('status').notNull().default('pending'), reviewedBy: uuid('reviewed_by'), reviewedAt: timestamp('reviewed_at', { withTimezone: true }), ...timestamps,
}, (t) => ({ accountIdx: index('patient_portal_requests_account_idx').on(t.accountId), clinicIdx: index('patient_portal_requests_clinic_idx').on(t.clinicId, t.status) }));
