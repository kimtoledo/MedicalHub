import StubPage from "@/components/admin/StubPage";
import { Building2 } from "lucide-react";

export default function ClinicsPage() {
  return (
    <StubPage
      title="Clinics"
      description="Create and manage clinic accounts, branches, slugs, and publication status. Assign packages and feature overrides."
      icon={<Building2 size={28} className="text-violet-500" />}
    />
  );
}
