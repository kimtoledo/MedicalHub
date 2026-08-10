import AppStubPage from "@/components/app/AppStubPage";
import { CalendarCheck } from "lucide-react";

export default function DentistSchedulePage() {
  return (
    <AppStubPage
      title="My Schedule"
      description="View your full appointment calendar across all assigned clinic branches. Filter by date, branch, and status."
      icon={<CalendarCheck size={28} className="text-violet-500" />}
    />
  );
}
