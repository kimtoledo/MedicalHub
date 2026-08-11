import { notFound, redirect } from "next/navigation";
import PatientProfile from "@/components/app/patients/PatientProfile";
import { getClinicPatient } from "@/lib/clinic-patients";
import { getClinicSession } from "@/lib/clinic-session";
import { getPatientTreatments } from "@/lib/clinic-treatments";
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
  const data = await getClinicPatient(
    identity.clinicId,
    params.patientId,
    sort,
  ).catch(() => null);
  if (!data) notFound();
  const treatments = await getPatientTreatments(identity.clinicId, params.patientId).catch(() => []);
  return (
    <PatientProfile
      clinicId={identity.clinicId}
      data={data}
      basePath="/app/dentist/patients"
      sort={sort}
      treatments={treatments}
    />
  );
}
