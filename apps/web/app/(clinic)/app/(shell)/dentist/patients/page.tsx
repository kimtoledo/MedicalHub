import AppStubPage from "@/components/app/AppStubPage";
import { Users } from "lucide-react";

export default function DentistPatientsPage() {
  return (
    <AppStubPage
      title="My Patients"
      description="Browse patients you have treated. Access their profiles, dental histories, encounters, and treatment records."
      icon={<Users size={28} className="text-violet-500" />}
    />
  );
}
