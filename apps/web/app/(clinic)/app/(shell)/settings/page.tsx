import AppStubPage from "@/components/app/AppStubPage";
import { Settings } from "lucide-react";

export default function ClinicSettingsPage() {
  return (
    <AppStubPage
      title="Clinic Settings"
      description="Manage clinic details, branch information, operating hours, service catalog, and public microsite content."
      icon={<Settings size={28} className="text-violet-500" />}
    />
  );
}
