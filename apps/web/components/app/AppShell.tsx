import AppSidebar from "./AppSidebar";
import AppTopBar from "./AppTopBar";
import AppMobileTabBar from "./AppMobileTabBar";
import type { ClinicIdentity } from "@/lib/clinic-types";

export default function AppShell({
  children,
  identity,
}: {
  children: React.ReactNode;
  identity: ClinicIdentity;
}) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AppSidebar role={identity.role} userEmail={identity.email} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppTopBar role={identity.role} userEmail={identity.email} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <AppMobileTabBar role={identity.role} />
    </div>
  );
}
