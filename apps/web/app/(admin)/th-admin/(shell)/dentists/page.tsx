import StubPage from "@/components/admin/StubPage";
import { Stethoscope } from "lucide-react";

export default function DentistsPage() {
  return (
    <StubPage
      title="Dentists"
      description="Invite and manage dentist profiles, verify credentials, manage clinic affiliations, and control public profile publication."
      icon={<Stethoscope size={28} className="text-violet-500" />}
    />
  );
}
