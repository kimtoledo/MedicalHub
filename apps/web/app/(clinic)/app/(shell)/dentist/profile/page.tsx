import { redirect } from "next/navigation";
import DentistProfileEditor from "@/components/app/profile/DentistProfileEditor";
import { getClinicSession } from "@/lib/clinic-session";

export default async function DentistProfilePage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  if (identity.membershipRole !== "dentist" || !identity.dentistId) redirect("/app/profile");
  return <DentistProfileEditor />;
}
