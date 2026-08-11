import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import EncountersListClient from "./EncountersListClient";

export type EncounterListItem = {
  id: string;
  date: string;
  status: string;
  chiefComplaint: string | null;
  branchId: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientNumber: string;
  dentistFirstName: string | null;
  dentistLastName: string | null;
};

export default async function EncountersPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/login");

  const cookieHeader = cookies().toString();
  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/encounters`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  const data = res.ok
    ? (await res.json() as { success: boolean; data: EncounterListItem[] })
    : { success: false, data: [] };

  return (
    <EncountersListClient
      encounters={data.success ? data.data : []}
      clinicId={identity.clinicId}
    />
  );
}
