import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import ServicesSettingsClient from "./ServicesSettingsClient";

export default async function ServicesSettingsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/login");

  return <ServicesSettingsClient clinicId={identity.clinicId} isAdmin={identity.isAdmin} />;
}
