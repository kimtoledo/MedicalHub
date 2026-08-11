import { redirect, notFound } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import PatientDetailClient from "./PatientDetailClient";

export type PatientDetail = {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  dateOfBirth: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  status: string;
};

export default async function PatientDetailPage({
  params,
}: {
  params: { patientId: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/login");

  const cookieHeader = cookies().toString();
  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/patients/${params.patientId}`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  if (res.status === 404) notFound();
  if (!res.ok) redirect("/app/patients");

  const json = await res.json() as { success: boolean; data: PatientDetail };
  if (!json.success) redirect("/app/patients");

  // branchId needed for file uploads — use caller's branchId from session (or empty if clinic-wide)
  const branchId = identity.branchId ?? "";

  return (
    <PatientDetailClient
      patient={json.data}
      clinicId={identity.clinicId}
      branchId={branchId}
    />
  );
}
