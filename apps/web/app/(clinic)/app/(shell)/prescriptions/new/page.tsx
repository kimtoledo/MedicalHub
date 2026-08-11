import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import NewPrescriptionClient from "./NewPrescriptionClient";

export default async function NewPrescriptionPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/login");
  return <NewPrescriptionClient clinicId={identity.clinicId} />;
}
