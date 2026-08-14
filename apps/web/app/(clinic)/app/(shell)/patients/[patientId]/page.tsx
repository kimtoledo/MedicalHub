import { notFound, redirect } from "next/navigation";
import PatientProfile from "@/components/app/patients/PatientProfile";
import { getClinicPatient, type PatientDetail as ClinicPatientDetail } from "@/lib/clinic-patients";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";
import { getPatientTreatments } from "@/lib/clinic-treatments";
import { getClinicDentists } from "@/lib/clinic-dentists";
import { getOdontogram } from "@/lib/clinic-odontogram";

export type PatientDetail = ClinicPatientDetail["patient"];

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: { patientId: string };
  searchParams: { appointmentSort?: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const sort = searchParams.appointmentSort === "asc" ? "asc" : "desc";
  const hasClinicalRole = ["clinic_owner", "clinic_admin", "dentist", "dental_assistant"].includes(identity.membershipRole);
  const hasAiImagingRole = ["clinic_owner", "clinic_admin", "dentist"].includes(identity.membershipRole);
  const [context, data] = await Promise.all([
    getClinicShellContext(identity),
    getClinicPatient(
      identity.clinicId,
      params.patientId,
      sort,
    ).catch(() => null),
  ]);
  if (!data) notFound();

  const canManageTreatmentPlans = identity.membershipRole === "dentist" || identity.isAdmin;
  const canUseOdontogram = hasClinicalRole && Boolean(context.entitlements["clinical.odontogram"]);
  const [treatments, dentists, odontogram] = await Promise.all([
    getPatientTreatments(identity.clinicId, params.patientId).catch(() => []),
    identity.isAdmin ? getClinicDentists(identity.clinicId).catch(() => []) : Promise.resolve([]),
    canUseOdontogram ? getOdontogram(identity.clinicId, params.patientId).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <PatientProfile
      clinicId={identity.clinicId}
      data={data}
      basePath="/app/patients"
      sort={sort}
      treatments={treatments}
      branchId={identity.branchId ?? ""}
      odontogram={odontogram}
      dentists={dentists}
      canUsePrescriptions={hasClinicalRole && Boolean(context.entitlements["clinical.prescriptions"])}
      canUseOdontogram={canUseOdontogram}
      canUseFiles={hasClinicalRole && Boolean(context.entitlements["clinical.radiographs"])}
      canUseAiImaging={hasAiImagingRole && Boolean(context.entitlements["ai.imaging"])}
      canUseHmo={Boolean(context.entitlements["hmo.claims"])}
      canUseTreatmentPlans={hasClinicalRole && Boolean(context.entitlements["clinical.treatment_plans"])}
      canManageTreatmentPlans={canManageTreatmentPlans}
    />
  );
}
