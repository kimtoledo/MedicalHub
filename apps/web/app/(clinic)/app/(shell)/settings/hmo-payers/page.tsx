import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import HmoPayersClient from "./HmoPayersClient";

export type HmoPayer = {
  id: string;
  name: string;
  accreditationNumber: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  isActive: string;
  createdAt: string;
};

export default async function HmoPayersPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  if (!identity.isAdmin) {
    redirect("/app/settings");
  }

  const cookieHeader = cookies().toString();
  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/hmo/payers`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  const json = res.ok
    ? await res.json() as { success: boolean; data: HmoPayer[] }
    : { success: false, data: [] };

  return (
    <HmoPayersClient
      payers={json.success ? json.data : []}
      clinicId={identity.clinicId}
    />
  );
}
