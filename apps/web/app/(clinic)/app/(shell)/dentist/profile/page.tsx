import AppStubPage from "@/components/app/AppStubPage";
import { UserCircle } from "lucide-react";

export default function DentistProfilePage() {
  return (
    <AppStubPage
      title="My Profile"
      description="Manage your dentist profile, professional information, clinic affiliations, and public profile publication settings."
      icon={<UserCircle size={28} className="text-violet-500" />}
    />
  );
}
