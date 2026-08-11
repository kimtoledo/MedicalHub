export type ClinicRole = "clinic_staff" | "dentist";

export type ClinicIdentity = {
  id: string;
  email: string;
  name: string;
  role: ClinicRole;
  /** True when the raw membership role is clinic_owner or clinic_admin. */
  isAdmin: boolean;
  clinicId: string;
  branchId: string | null;
  dentistId: string | null;
};
