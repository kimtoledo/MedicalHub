import { redirect, notFound } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import AmendPrescriptionClient from "./AmendPrescriptionClient";
import type { PrescriptionDetail } from "../page";

export default async function AmendPrescriptionPage({
  params,
}: {
  params: { prescriptionId: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const cookieHeader = cookies().toString();
  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/prescriptions/${params.prescriptionId}`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  if (res.status === 404) notFound();
  if (!res.ok) redirect("/app/prescriptions");

  const json = await res.json() as { success: boolean; data: PrescriptionDetail };
  if (!json.success) redirect("/app/prescriptions");

  return (
    <AmendPrescriptionClient
      original={json.data}
      clinicId={identity.clinicId}
    />
  );
}
