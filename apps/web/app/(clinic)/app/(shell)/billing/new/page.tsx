import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import NewInvoiceClient from "./NewInvoiceClient";

export type UnbilledEncounter = {
  id: string;
  date: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientNumber: string;
  status: string;
  chiefComplaint: string | null;
  treatmentCount: number;
  branchId: string;
};

export default async function NewInvoicePage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const cookieHeader = cookies().toString();
  const url = getBackendUrl(`/v1/clinic/${identity.clinicId}/invoices/unbilled`);

  let encounters: UnbilledEncounter[] = [];
  try {
    const res = await fetch(url, { headers: { cookie: cookieHeader }, cache: "no-store" });
    if (res.ok) {
      const body = await res.json() as { success: boolean; data: UnbilledEncounter[] };
      if (body.success) encounters = body.data;
    }
  } catch {
    // render empty state
  }

  return (
    <NewInvoiceClient
      encounters={encounters}
      clinicId={identity.clinicId}
      branchId={identity.branchId ?? ""}
    />
  );
}
