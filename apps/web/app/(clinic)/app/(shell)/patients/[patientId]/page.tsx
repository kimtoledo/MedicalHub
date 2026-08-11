import { notFound, redirect } from "next/navigation";
import PatientProfile from "@/components/app/patients/PatientProfile";
import { getClinicPatient, type PatientDetail as ClinicPatientDetail } from "@/lib/clinic-patients";
import { getClinicSession } from "@/lib/clinic-session";
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
  const data = await getClinicPatient(
    identity.clinicId,
    params.patientId,
    sort,
  ).catch(() => null);
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
      />
    </>
  );
}
