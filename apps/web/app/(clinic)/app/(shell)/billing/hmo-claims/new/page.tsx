import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import NewClaimClient from "./NewClaimClient";

export default async function NewClaimPage(
  props: { searchParams: Promise<{ patientId?: string; invoiceId?: string; encounterId?: string }> }
) {
  const searchParams = await props.searchParams;
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  return <NewClaimClient clinicId={identity.clinicId} initialSelection={{ patientId: searchParams.patientId ?? "", invoiceId: searchParams.invoiceId ?? "", encounterId: searchParams.encounterId ?? "" }} />;
}
