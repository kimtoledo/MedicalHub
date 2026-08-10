import AppStubPage from "@/components/app/AppStubPage";
import { CalendarDays } from "lucide-react";

export default function AppointmentsPage() {
  return (
    <AppStubPage
      title="Appointments"
      description="View and manage the clinic appointment calendar. Day, week, and list views with filters by branch, dentist, and status."
      icon={<CalendarDays size={28} className="text-violet-500" />}
    />
  );
}
