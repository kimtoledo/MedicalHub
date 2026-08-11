import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import NewClaimClient from "./NewClaimClient";
import type { HmoPayer } from "./types";

export default async function NewClaimPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const cookieHeader = cookies().toString();
  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/hmo/payers`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  const json = res.ok
    ? await res.json() as { success: boolean; data: HmoPayer[] }
    : { success: false, data: [] };

  const activePayers = json.success
    ? json.data.filter((p) => p.isActive === "true")
    : [];

  return <NewClaimClient clinicId={identity.clinicId} payers={activePayers} />;
}
