import StubPage from "@/components/admin/StubPage";
import { ScrollText } from "lucide-react";

export default function AuditPage() {
  return (
    <StubPage
      title="Audit Log"
      description="Immutable record of all platform-level actions — clinic lifecycle events, subscription changes, feature overrides, and support access."
      icon={<ScrollText size={28} className="text-violet-500" />}
    />
  );
}
