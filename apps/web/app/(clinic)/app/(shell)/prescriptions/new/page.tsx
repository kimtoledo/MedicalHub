import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import NewPrescriptionClient from "./NewPrescriptionClient";

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: { encounterId?: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  return (
    <NewPrescriptionClient
      clinicId={identity.clinicId}
      initialEncounterId={searchParams.encounterId}
    />
  );
}
