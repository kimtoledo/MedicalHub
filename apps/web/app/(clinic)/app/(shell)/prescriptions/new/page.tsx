import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getClinicDentists } from "@/lib/clinic-dentists";
import NewPrescriptionClient from "./NewPrescriptionClient";

export default async function NewPrescriptionPage(
  props: {
    searchParams: Promise<{ encounterId?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  const dentists = identity.isAdmin ? await getClinicDentists(identity.clinicId).catch(() => []) : [];
  return (
    <NewPrescriptionClient
      clinicId={identity.clinicId}
      initialEncounterId={searchParams.encounterId}
      dentists={dentists}
    />
  );
}
