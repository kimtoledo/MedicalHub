import { notFound, redirect } from "next/navigation";
import PatientProfile from "@/components/app/patients/PatientProfile";
import { getClinicPatient } from "@/lib/clinic-patients";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";
import { getPatientTreatments } from "@/lib/clinic-treatments";
import PatientRecordExtensions from "../../../patients/[patientId]/PatientRecordExtensions";

export default async function DentistPatientPage({
  params,
  searchParams,
}: {
  params: { patientId: string };
  searchParams: { appointmentSort?: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  const sort = searchParams.appointmentSort === "asc" ? "asc" : "desc";
  const [context, data] = await Promise.all([
    getClinicShellContext(identity),
    getClinicPatient(identity.clinicId, params.patientId, sort).catch(() => null),
  ]);
  if (!data) notFound();
  const treatments = await getPatientTreatments(identity.clinicId, params.patientId).catch(() => []);
  return (
    <>
      <PatientProfile
        clinicId={identity.clinicId}
        data={data}
        basePath="/app/dentist/patients"
        sort={sort}
        treatments={treatments}
      />
      <PatientRecordExtensions
        clinicId={identity.clinicId}
        patientId={data.patient.id}
        branchId={identity.branchId ?? ""}
        canUsePrescriptions={Boolean(context.entitlements["clinical.prescriptions"])}
        canUseFiles={false}
        canUseAiImaging={false}
        canUseHmo={false}
        canUseTreatmentPlans={false}
        canManageTreatmentPlans={false}
      />
    </>
  );
}
