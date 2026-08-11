export type ClinicRole = "clinic_staff" | "dentist";

export type ClinicIdentity = {
  id: string;
  email: string;
  name: string;
  role: ClinicRole;
  clinicId: string;
  branchId: string | null;
  dentistId: string | null;
};
