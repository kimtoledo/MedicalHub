import { notFound, redirect } from "next/navigation";
import PatientProfile from "@/components/app/patients/PatientProfile";
import { getClinicPatient } from "@/lib/clinic-patients";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";
import { getPatientTreatments } from "@/lib/clinic-treatments";
import { getOdontogram } from "@/lib/clinic-odontogram";

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
  const canUseOdontogram = Boolean(context.entitlements["clinical.odontogram"]);
  const [treatments, odontogram] = await Promise.all([
    getPatientTreatments(identity.clinicId, params.patientId).catch(() => []),
    canUseOdontogram ? getOdontogram(identity.clinicId, params.patientId).catch(() => null) : Promise.resolve(null),
  ]);
  return (
    <PatientProfile
      clinicId={identity.clinicId}
      data={data}
      basePath="/app/dentist/patients"
      sort={sort}
      treatments={treatments}
      appointmentDentistId={identity.dentistId}
      branchId={identity.branchId ?? ""}
      odontogram={odontogram}
      canUsePrescriptions={Boolean(context.entitlements["clinical.prescriptions"])}
      canUseOdontogram={canUseOdontogram}
      canUseFiles={false}
      canUseAiImaging={false}
      canUseHmo={false}
      canUseTreatmentPlans={false}
      canManageTreatmentPlans={false}
    />
  );
}
