"use client";

import { useEffect, useState } from "react";
import AppSidebar from "./AppSidebar";
import AppTopBar from "./AppTopBar";
import AppMobileTabBar from "./AppMobileTabBar";
import { getSession, type ClinicSession } from "./ClinicAuthGuard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ClinicSession | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  const role = session?.role ?? "clinic_staff";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AppSidebar role={role} userEmail={session?.email} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppTopBar role={role} userEmail={session?.email} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <AppMobileTabBar role={role} />
    </div>
  );
}
