import AppStubPage from "@/components/app/AppStubPage";
import { Grid3X3 } from "lucide-react";

export default function OdontogramPage() {
  return (
    <AppStubPage
      title="Odontogram"
      description="Interactive adult dental chart for recording tooth conditions, surfaces, procedures, and treatment history per patient."
      icon={<Grid3X3 size={28} className="text-violet-500" />}
    />
  );
}
