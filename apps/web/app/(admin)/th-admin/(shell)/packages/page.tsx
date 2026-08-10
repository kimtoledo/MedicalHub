import StubPage from "@/components/admin/StubPage";
import { Package } from "lucide-react";

export default function PackagesPage() {
  return (
    <StubPage
      title="Packages & Plans"
      description="Define subscription packages, manage the feature catalog, and configure which features are included in each plan."
      icon={<Package size={28} className="text-violet-500" />}
    />
  );
}
