import Sidebar from "@/components/admin/Sidebar";
import TopBar from "@/components/admin/TopBar";
import MobileTabBar from "@/components/admin/MobileTabBar";
import { getSuperAdminSession } from "@/lib/admin-session";
import { redirect } from "next/navigation";

/** Full admin shell with sidebar + topbar — wraps all authenticated pages. */
export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getSuperAdminSession();

  if (!admin) {
    redirect("/dentra-admin/login");
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Persistent sidebar — lg+ only */}
      <Sidebar admin={admin} />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar admin={admin} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile/tablet */}
      <MobileTabBar />
    </div>
  );
}
