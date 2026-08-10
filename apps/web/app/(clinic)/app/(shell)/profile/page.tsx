import AppStubPage from "@/components/app/AppStubPage";
import { UserCircle } from "lucide-react";

export default function StaffProfilePage() {
  return (
    <AppStubPage
      title="My Profile"
      description="View and update your account details, contact information, and notification preferences."
      icon={<UserCircle size={28} className="text-violet-500" />}
    />
  );
}
