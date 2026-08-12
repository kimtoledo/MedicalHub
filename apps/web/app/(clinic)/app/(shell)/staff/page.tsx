import { redirect } from "next/navigation";
import AppPageError from "@/components/app/AppPageError";
import StaffManager from "@/components/app/staff/StaffManager";
import { getClinicSession } from "@/lib/clinic-session";

export default async function StaffPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  if (!identity.isAdmin) {
    return <AppPageError title="Staff management restricted" message="Clinic Owner or Admin access is required." kind="forbidden" />;
  }
  return <StaffManager clinicId={identity.clinicId} currentUserId={identity.id} currentRole={identity.membershipRole} />;
}
