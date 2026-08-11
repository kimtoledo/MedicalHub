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

  // Staff features
  STAFF_MANAGE: 'staff.manage',
  ROLES_MANAGE: 'roles.manage',

  // Billing features (MVP 2)
  BILLING_INVOICES: 'billing.invoices',
  BILLING_PAYMENTS: 'billing.payments',
  PRESCRIPTIONS: 'clinical.prescriptions',

  // Inventory (MVP 2)
  INVENTORY_MANAGE: 'inventory.manage',

  // Imaging (MVP 2)
  RADIOGRAPHS: 'clinical.radiographs',

  // Reports
  REPORTS_BASIC: 'reports.basic',
  REPORTS_ADVANCED: 'reports.advanced',

  // Microsite
  MICROSITE_PUBLISH: 'microsite.publish',
  MICROSITE_CUSTOMIZE: 'microsite.customize',

  // Branch management
  BRANCHES_MULTI: 'branches.multi',
} as const;
export type FeatureKey = (typeof FeatureKey)[keyof typeof FeatureKey];

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

  // Dentist lifecycle
  DENTIST_CREATED: 'dentist.created',
  DENTIST_AFFILIATED: 'dentist.affiliated',
  DENTIST_UNAFFILIATED: 'dentist.unaffiliated',

  // Membership / roles
  MEMBER_INVITED: 'member.invited',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_REMOVED: 'member.removed',

  // Subscriptions / entitlements
  SUBSCRIPTION_ASSIGNED: 'subscription.assigned',
  SUBSCRIPTION_CHANGED: 'subscription.changed',
  FEATURE_OVERRIDE_SET: 'feature_override.set',
  FEATURE_OVERRIDE_REMOVED: 'feature_override.removed',

  // Appointments
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_STATUS_CHANGED: 'appointment.status_changed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',

  // Clinical
  ENCOUNTER_CREATED: 'encounter.created',
  ENCOUNTER_UPDATED: 'encounter.updated',
  TREATMENT_RECORDED: 'treatment.recorded',
  ODONTOGRAM_EVENT: 'odontogram.event',

  // Support / admin access
  SUPPORT_ACCESS_GRANTED: 'support_access.granted',
  SUPPORT_ACCESS_USED: 'support_access.used',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
