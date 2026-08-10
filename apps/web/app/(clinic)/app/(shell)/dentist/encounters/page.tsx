import AppStubPage from "@/components/app/AppStubPage";
import { ClipboardList } from "lucide-react";

export default function EncountersPage() {
  return (
    <AppStubPage
      title="Encounters"
      description="Create and review clinical encounter notes — chief complaints, examinations, diagnoses, procedures, and recommendations."
      icon={<ClipboardList size={28} className="text-violet-500" />}
    />
  );
}
