import StubPage from "@/components/admin/StubPage";
import { CreditCard } from "lucide-react";

export default function SubscriptionsPage() {
  return (
    <StubPage
      title="Subscriptions"
      description="View and manage clinic subscription assignments, renewal dates, status, and per-clinic feature overrides."
      icon={<CreditCard size={28} className="text-violet-500" />}
    />
  );
}
