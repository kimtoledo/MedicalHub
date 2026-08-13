export type ClinicRole = "clinic_staff" | "dentist";

export type ClinicIdentity = {
  id: string;
  email: string;
  name: string;
  role: ClinicRole;
  /** Exact database membership role used for role-aware navigation/actions. */
  membershipRole: string;
  /** True when the raw membership role is clinic_owner or clinic_admin. */
  isAdmin: boolean;
  clinicId: string;
  branchId: string | null;
  dentistId: string | null;
};

export type ClinicBranchContext = { id: string; name: string; isMain: boolean; city: string | null; province: string | null };
export type ClinicShellContext = {
  clinic: { id: string; name: string; maintenanceMode: boolean };
  branches: ClinicBranchContext[];
  initialBranchId: string | null;
  entitlements: Record<string, boolean>;
  packageName: string | null;
};
