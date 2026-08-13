import { notFound, redirect } from "next/navigation";
import PatientProfile from "@/components/app/patients/PatientProfile";
import { getClinicPatient, type PatientDetail as ClinicPatientDetail } from "@/lib/clinic-patients";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";
import { getPatientTreatments } from "@/lib/clinic-treatments";
import PatientRecordExtensions from "./PatientRecordExtensions";

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

  const treatments = await getPatientTreatments(
    identity.clinicId,
    params.patientId,
  ).catch(() => []);

  return (
    <>
      <PatientProfile
        clinicId={identity.clinicId}
        data={data}
        basePath="/app/patients"
        sort={sort}
        treatments={treatments}
      />
      <PatientRecordExtensions
        clinicId={identity.clinicId}
        patientId={data.patient.id}
        branchId={identity.branchId ?? ""}
        canUsePrescriptions={hasClinicalRole && Boolean(context.entitlements["clinical.prescriptions"])}
        canUseFiles={hasClinicalRole && Boolean(context.entitlements["clinical.radiographs"])}
        canUseAiImaging={hasAiImagingRole && Boolean(context.entitlements["ai.imaging"])}
        canUseHmo={Boolean(context.entitlements["hmo.claims"])}
        canUseTreatmentPlans={hasClinicalRole && Boolean(context.entitlements["clinical.treatment_plans"])}
        canManageTreatmentPlans={identity.membershipRole === "dentist"}
      />
    </>
  );
}
