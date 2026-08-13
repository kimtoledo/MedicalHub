// ---------------------------------------------------------------------------
// Platform roles
// ---------------------------------------------------------------------------
export const PlatformRole = {
  SUPER_ADMIN: 'super_admin',
  PLATFORM_SUPPORT: 'platform_support',
} as const;
export type PlatformRole = (typeof PlatformRole)[keyof typeof PlatformRole];

// ---------------------------------------------------------------------------
// Clinic roles
// ---------------------------------------------------------------------------
export const ClinicRole = {
  CLINIC_OWNER: 'clinic_owner',
  CLINIC_ADMIN: 'clinic_admin',
  DENTIST: 'dentist',
  RECEPTIONIST: 'receptionist',
  DENTAL_ASSISTANT: 'dental_assistant',
  CASHIER: 'cashier',           // MVP 2
  INVENTORY_STAFF: 'inventory_staff', // MVP 2
} as const;
export type ClinicRole = (typeof ClinicRole)[keyof typeof ClinicRole];

export const PermissionKey = {
  APPOINTMENTS: 'appointments.manage',
  PATIENTS: 'patients.manage',
  CLINICAL_RECORDS: 'clinical.records',
  BILLING_INVOICES: 'billing.invoices',
  BILLING_PAYMENTS: 'billing.payments',
  INVENTORY: 'inventory.manage',
  REPORTS: 'reports.basic',
  MICROSITE: 'microsite.customize',
} as const;
export type PermissionKey = (typeof PermissionKey)[keyof typeof PermissionKey];

// ---------------------------------------------------------------------------
// Clinic / branch status
// ---------------------------------------------------------------------------
export const ClinicStatus = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
} as const;
export type ClinicStatus = (typeof ClinicStatus)[keyof typeof ClinicStatus];

// ---------------------------------------------------------------------------
// Dentist / profile status
// ---------------------------------------------------------------------------
export const PublicationStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
} as const;
export type PublicationStatus = (typeof PublicationStatus)[keyof typeof PublicationStatus];

export const VerificationStatus = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

// ---------------------------------------------------------------------------
// Appointment status
// ---------------------------------------------------------------------------
export const AppointmentStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled',
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

// ---------------------------------------------------------------------------
// Subscription / package status
// ---------------------------------------------------------------------------
export const SubscriptionStatus = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

// ---------------------------------------------------------------------------
// Feature entitlement keys
// Used as the authoritative contract between backend checks and package config.
// Never use plan names (e.g. "pro") for authorization — always use these keys.
// ---------------------------------------------------------------------------
export const FeatureKey = {
  // Appointment features
  APPOINTMENTS_MANAGE: 'appointments.manage',
  APPOINTMENTS_CALENDAR: 'appointments.calendar',
  BOOKING_PUBLIC: 'booking.public',

  // Patient features
  PATIENTS_MANAGE: 'patients.manage',
  CLINICAL_RECORDS: 'clinical.records',
  ODONTOGRAM: 'clinical.odontogram',
  ENCOUNTERS: 'clinical.encounters',
  TREATMENT_RECORDS: 'clinical.treatment_records',
  TREATMENT_PLANS: 'clinical.treatment_plans',

  // Staff features
  STAFF_MANAGE: 'staff.manage',
  ROLES_MANAGE: 'roles.manage',

  // Billing features (MVP 1 lite → MVP 2 full)
  BILLING_INVOICES: 'billing.invoices',
  BILLING_PAYMENTS: 'billing.payments',
  SERVICE_CATALOG: 'billing.service_catalog',
  PRESCRIPTIONS: 'clinical.prescriptions',

  // Inventory (MVP 2)
  INVENTORY_MANAGE: 'inventory.manage',

  // Clinical file uploads / imaging (MVP 1 basic → MVP 3 AI imaging)
  RADIOGRAPHS: 'clinical.radiographs',

  // AI assistance (MVP 2)
  AI_NOTES: 'ai.notes',
  AI_RECALL: 'ai.recall',
  AI_TREATMENT_SEQUENCE: 'ai.treatment_sequence',
  AI_IMAGING: 'ai.imaging',

  // Tele-dentistry (MVP 2)
  TELEDENTISTRY: 'teledentistry',

  // HMO / Insurance (MVP 2)
  HMO_CLAIMS: 'hmo.claims',

  // Reports
  REPORTS_BASIC: 'reports.basic',
  REPORTS_ADVANCED: 'reports.advanced',

  // Microsite
  MICROSITE_PUBLISH: 'microsite.publish',
  MICROSITE_CUSTOMIZE: 'microsite.customize',

  // Branch management
  BRANCHES_MULTI: 'branches.multi',
  KIOSK_CHECKIN: 'kiosk.checkin',
} as const;
export type FeatureKey = (typeof FeatureKey)[keyof typeof FeatureKey];

// ---------------------------------------------------------------------------
// Invoice status
// ---------------------------------------------------------------------------
export const InvoiceStatus = {
  PENDING: 'pending',
  PAID:    'paid',
  VOIDED:  'voided',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

// ---------------------------------------------------------------------------
// Payment method
// ---------------------------------------------------------------------------
export const PaymentMethod = {
  CASH:          'cash',
  GCASH:         'gcash',
  CARD:          'card',
  BANK_TRANSFER: 'bank_transfer',
  OTHER:         'other',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// ---------------------------------------------------------------------------
// Clinical file types
// ---------------------------------------------------------------------------
export const ClinicalFileType = {
  RADIOGRAPH:       'radiograph',
  INTRAORAL_PHOTO:  'intraoral_photo',
  EXTRAORAL_PHOTO:  'extraoral_photo',
  CONSENT_FORM:     'consent_form',
  LAB_RESULT:       'lab_result',
  REFERRAL_LETTER:  'referral_letter',
  OTHER:            'other',
} as const;
export type ClinicalFileType = (typeof ClinicalFileType)[keyof typeof ClinicalFileType];

// ---------------------------------------------------------------------------
// Prescription status
// ---------------------------------------------------------------------------
export const PrescriptionStatus = {
  ISSUED: 'issued',
} as const;
export type PrescriptionStatus = (typeof PrescriptionStatus)[keyof typeof PrescriptionStatus];

// ---------------------------------------------------------------------------
// Audit event actions
// ---------------------------------------------------------------------------
export const AuditAction = {
  // Clinic lifecycle
  CLINIC_CREATED: 'clinic.created',
  CLINIC_ACTIVATED: 'clinic.activated',
  CLINIC_UPDATED: 'clinic.updated',
  CLINIC_SUSPENDED: 'clinic.suspended',
  CLINIC_REACTIVATED: 'clinic.reactivated',
  CLINIC_ARCHIVED: 'clinic.archived',
  CLINIC_PUBLISHED: 'clinic.published',
  CLINIC_UNPUBLISHED: 'clinic.unpublished',

  // Branch lifecycle
  BRANCH_CREATED: 'branch.created',
  BRANCH_UPDATED: 'branch.updated',

  // Dentist lifecycle
  DENTIST_CREATED: 'dentist.created',
  DENTIST_AFFILIATED: 'dentist.affiliated',
  DENTIST_UNAFFILIATED: 'dentist.unaffiliated',
  DENTIST_VERIFIED: 'dentist.verified',
  DENTIST_VERIFICATION_REVOKED: 'dentist.verification_revoked',
  DENTIST_PUBLISHED: 'dentist.published',
  DENTIST_UNPUBLISHED: 'dentist.unpublished',
  DENTIST_PROFILE_UPDATED: 'dentist.profile_updated',

  // Membership / roles
  MEMBER_INVITED: 'member.invited',
  MEMBER_INVITE_RESENT: 'member.invite_resent',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_BRANCH_CHANGED: 'member.branch_changed',
  MEMBER_BRANCH_ASSIGNMENT_ADDED: 'member.branch_assignment_added',
  MEMBER_BRANCH_ASSIGNMENT_REMOVED: 'member.branch_assignment_removed',
  MEMBER_STATUS_CHANGED: 'member.status_changed',
  MEMBER_REMOVED: 'member.removed',
  ACCOUNT_PROFILE_UPDATED: 'account.profile_updated',

  // Subscriptions / entitlements
  SUBSCRIPTION_ASSIGNED: 'subscription.assigned',
  SUBSCRIPTION_CHANGED: 'subscription.changed',
  FEATURE_OVERRIDE_SET: 'feature_override.set',
  FEATURE_OVERRIDE_REMOVED: 'feature_override.removed',
  PACKAGE_CREATED: 'package.created',
  PACKAGE_UPDATED: 'package.updated',
  PACKAGE_DEACTIVATED: 'package.deactivated',

  // Appointments
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_STATUS_CHANGED: 'appointment.status_changed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',

  // Patient records
  PATIENT_CREATED: 'patient.created',
  MEDICAL_HISTORY_RECORDED: 'patient.medical_history_recorded',
  DENTAL_HISTORY_RECORDED: 'patient.dental_history_recorded',

  // Clinical
  ENCOUNTER_CREATED: 'encounter.created',
  ENCOUNTER_UPDATED: 'encounter.updated',
  ENCOUNTER_FINALIZED: 'encounter.finalized',
  TREATMENT_RECORDED: 'treatment.recorded',
  TREATMENT_PLAN_CREATED: 'treatment_plan.created',
  TREATMENT_PLAN_UPDATED: 'treatment_plan.updated',
  TREATMENT_PLAN_STATUS_CHANGED: 'treatment_plan.status_changed',
  TREATMENT_PLAN_ITEM_STATUS_CHANGED: 'treatment_plan_item.status_changed',
  ODONTOGRAM_EVENT: 'odontogram.event',

  // Billing
  INVOICE_CREATED:   'invoice.created',
  INVOICE_PAID:      'invoice.paid',
  INVOICE_VOIDED:    'invoice.voided',
  INVOICE_REFUNDED:  'invoice.refunded',
  INVOICE_ADJUSTED:  'invoice.adjusted',
  PAYMENT_RECORDED:  'payment.recorded',

  // Service catalog and pricing
  SERVICE_CREATED: 'service.created',
  SERVICE_UPDATED: 'service.updated',
  SERVICE_STATUS_CHANGED: 'service.status_changed',
  SERVICE_PRICE_CHANGED: 'service.price_changed',

  // Inventory
  INVENTORY_ITEM_CREATED: 'inventory.item_created',
  INVENTORY_ITEM_UPDATED: 'inventory.item_updated',
  INVENTORY_TRANSACTION_RECORDED: 'inventory.transaction_recorded',

  // Notifications
  NOTIFICATION_QUEUED: 'notification.queued',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  SUBSCRIPTION_REQUESTED: 'subscription.requested',
  SUBSCRIPTION_REVIEWED: 'subscription.reviewed',
  USAGE_RECORDED: 'usage.recorded',
  PERMISSION_UPDATED: 'permission.updated',
  VERIFICATION_SUBMITTED: 'verification.submitted',
  VERIFICATION_APPROVED: 'verification.approved',
  VERIFICATION_REJECTED: 'verification.rejected',
  VERIFICATION_REVOKED: 'verification.revoked',
  REVIEW_MODERATED: 'review.moderated',
  REVIEW_RESPONDED: 'review.responded',
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_CLINIC_ATTACHED: 'organization.clinic_attached',
  ORGANIZATION_MEMBER_UPDATED: 'organization.member_updated',
  ORGANIZATION_SERVICE_CREATED: 'organization.service_created',
  ORGANIZATION_SERVICE_UPDATED: 'organization.service_updated',
  ORGANIZATION_SERVICE_ADOPTED: 'organization.service_adopted',
  ORGANIZATION_ENTITLEMENT_GRANTED: 'organization.entitlement_granted',
  PAYMENT_LINK_CREATED: 'payment_link.created',
  PAYMENT_LINK_CANCELLED: 'payment_link.cancelled',
  PAYMENT_WEBHOOK_PROCESSED: 'payment_webhook.processed',
  DOMAIN_ADDED: 'domain.added',
  DOMAIN_CHECKED: 'domain.checked',
  DOMAIN_VERIFIED: 'domain.verified',
  DOMAIN_ACTIVATED: 'domain.activated',
  INTEGRATION_API_KEY_CREATED: 'integration.api_key_created',
  INTEGRATION_API_KEY_REVOKED: 'integration.api_key_revoked',
  INTEGRATION_WEBHOOK_CREATED: 'integration.webhook_created',
  INTEGRATION_WEBHOOK_DISABLED: 'integration.webhook_disabled',
  SUPPORT_ACCESS_REQUESTED: 'support_access.requested',
  SUPPORT_ACCESS_REVIEWED: 'support_access.reviewed',
  TENANT_EXPORT_REQUESTED: 'tenant_export.requested',
  TENANT_EXPORT_GENERATED: 'tenant_export.generated',
  TENANT_EXPORT_DOWNLOAD_LINK_ISSUED: 'tenant_export.download_link_issued',
  FEATURE_FLAG_CREATED: 'feature_flag.created',
  FEATURE_FLAG_ROLLOUT_UPDATED: 'feature_flag.rollout_updated',
  FEATURE_FLAG_CLINIC_ADDED: 'feature_flag.clinic_added',
  FEATURE_FLAG_CLINIC_REMOVED: 'feature_flag.clinic_removed',

  RECALL_RULE_CREATED: 'recall_rule.created',
  RECALL_RULE_UPDATED: 'recall_rule.updated',
  RECALL_CREATED: 'recall.created',
  RECALL_CONTACTED: 'recall.contacted',
  RECALL_DISMISSED: 'recall.dismissed',
  RECALL_OVERRIDDEN: 'recall.overridden',
  RECALL_BOOKED: 'recall.booked',

  // Prescriptions
  PRESCRIPTION_ISSUED: 'prescription.issued',

  // Clinical files
  FILE_UPLOADED: 'file.uploaded',
  FILE_DELETED: 'file.deleted',
  FILE_URL_GENERATED: 'file.url_generated',

  // AI assistance
  AI_NOTE_SUGGESTED: 'ai.note_suggested',
  AI_RECALL_SUGGESTED: 'ai.recall_suggested',
  AI_TREATMENT_SEQUENCE_SUGGESTED: 'ai.treatment_sequence_suggested',

  // Tele-dentistry
  REMOTE_ASSESSMENT_SUBMITTED: 'remote_assessment.submitted',
  REMOTE_ASSESSMENT_REVIEWED: 'remote_assessment.reviewed',
  REMOTE_ASSESSMENT_CLOSED: 'remote_assessment.closed',

  // HMO / Insurance claims
  HMO_PAYER_CREATED: 'hmo_payer.created',
  HMO_PAYER_UPDATED: 'hmo_payer.updated',
  HMO_CLAIM_CREATED: 'hmo_claim.created',
  HMO_CLAIM_STATUS_CHANGED: 'hmo_claim.status_changed',

  // Support / admin access
  SUPPORT_ACCESS_GRANTED: 'support_access.granted',
  SUPPORT_ACCESS_USED: 'support_access.used',
  AI_IMAGING_ANALYZED: 'ai.imaging_analyzed',
  AI_IMAGING_CONFIRMED: 'ai.imaging_confirmed',
  NOTIFICATION_PROVIDER_CONNECTED: 'notification_provider.connected',
  NOTIFICATION_PROVIDER_REMOVED: 'notification_provider.removed',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
