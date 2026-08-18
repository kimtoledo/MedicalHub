import {
  FeatureKey,
  PermissionKey,
  type ClinicRole,
  type FeatureKey as FeatureKeyValue,
  type PermissionKey as PermissionKeyValue,
} from "@dentra/shared";
import type { ClinicAccess } from "../auth/types.js";

export const permissionPresets: Record<ClinicRole, PermissionKeyValue[]> = {
  clinic_owner: Object.values(PermissionKey),
  clinic_admin: Object.values(PermissionKey),
  dentist: [
    PermissionKey.APPOINTMENTS,
    PermissionKey.PATIENTS,
    PermissionKey.CLINICAL_RECORDS,
    PermissionKey.REPORTS,
  ],
  receptionist: [
    PermissionKey.APPOINTMENTS,
    PermissionKey.PATIENTS,
    PermissionKey.BILLING_INVOICES,
    PermissionKey.BILLING_PAYMENTS,
  ],
  dental_assistant: [
    PermissionKey.APPOINTMENTS,
    PermissionKey.PATIENTS,
    PermissionKey.CLINICAL_RECORDS,
    PermissionKey.BILLING_INVOICES,
    PermissionKey.BILLING_PAYMENTS,
  ],
  cashier: [PermissionKey.BILLING_INVOICES, PermissionKey.BILLING_PAYMENTS],
  inventory_staff: [PermissionKey.INVENTORY],
};

export const featurePermission: Partial<
  Record<FeatureKeyValue, PermissionKeyValue>
> = {
  [FeatureKey.APPOINTMENTS_MANAGE]: PermissionKey.APPOINTMENTS,
  [FeatureKey.APPOINTMENTS_CALENDAR]: PermissionKey.APPOINTMENTS,
  [FeatureKey.PATIENTS_MANAGE]: PermissionKey.PATIENTS,
  [FeatureKey.CLINICAL_RECORDS]: PermissionKey.CLINICAL_RECORDS,
  [FeatureKey.ODONTOGRAM]: PermissionKey.CLINICAL_RECORDS,
  [FeatureKey.ENCOUNTERS]: PermissionKey.CLINICAL_RECORDS,
  [FeatureKey.TREATMENT_RECORDS]: PermissionKey.CLINICAL_RECORDS,
  [FeatureKey.TREATMENT_PLANS]: PermissionKey.CLINICAL_RECORDS,
  [FeatureKey.PRESCRIPTIONS]: PermissionKey.CLINICAL_RECORDS,
  [FeatureKey.RADIOGRAPHS]: PermissionKey.CLINICAL_RECORDS,
  [FeatureKey.BILLING_INVOICES]: PermissionKey.BILLING_INVOICES,
  [FeatureKey.BILLING_PAYMENTS]: PermissionKey.BILLING_PAYMENTS,
  [FeatureKey.SERVICE_CATALOG]: PermissionKey.BILLING_INVOICES,
  [FeatureKey.INVENTORY_MANAGE]: PermissionKey.INVENTORY,
  [FeatureKey.REPORTS_BASIC]: PermissionKey.REPORTS,
  [FeatureKey.REPORTS_ADVANCED]: PermissionKey.REPORTS,
  [FeatureKey.MICROSITE_PUBLISH]: PermissionKey.MICROSITE,
  [FeatureKey.MICROSITE_CUSTOMIZE]: PermissionKey.MICROSITE,
};

const operationalPermissionOverrides = new Set<PermissionKeyValue>([
  PermissionKey.APPOINTMENTS,
  PermissionKey.PATIENTS,
  PermissionKey.BILLING_INVOICES,
  PermissionKey.BILLING_PAYMENTS,
  PermissionKey.INVENTORY,
  PermissionKey.MICROSITE,
]);

export function hasEffectivePermission(
  membership: ClinicAccess,
  permission: PermissionKeyValue,
) {
  const permissions = membership.permissions ?? permissionPresets[membership.role];
  return permissions.includes(permission);
}

export function permissionCanExtendRole(permission: PermissionKeyValue) {
  return operationalPermissionOverrides.has(permission);
}
