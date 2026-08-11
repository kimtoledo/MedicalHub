import StubPage from "@/components/admin/StubPage";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <StubPage
      title="Settings"
      description="Configure platform-wide settings, manage Super Admin accounts, and set system defaults."
      icon={<Settings size={28} className="text-violet-500" />}
    />
  );
}
