import AppStubPage from "@/components/app/AppStubPage";
import { Users } from "lucide-react";

export default function PatientsPage() {
  return (
    <AppStubPage
      title="Patients"
      description="Search and manage patient profiles, medical histories, dental histories, and appointment records."
      icon={<Users size={28} className="text-violet-500" />}
    />
  );
}
