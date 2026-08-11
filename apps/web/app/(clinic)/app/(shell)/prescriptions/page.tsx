import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import PrescriptionsListClient from "./PrescriptionsListClient";

export default async function PrescriptionsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/login");
  return <PrescriptionsListClient clinicId={identity.clinicId} />;
}
