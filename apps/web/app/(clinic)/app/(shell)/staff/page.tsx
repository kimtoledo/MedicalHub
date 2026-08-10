import AppStubPage from "@/components/app/AppStubPage";
import { UserCog } from "lucide-react";

export default function StaffPage() {
  return (
    <AppStubPage
      title="Staff"
      description="Manage clinic team members, roles, and permissions. Invite new staff and manage dentist affiliations."
      icon={<UserCog size={28} className="text-violet-500" />}
    />
  );
}
