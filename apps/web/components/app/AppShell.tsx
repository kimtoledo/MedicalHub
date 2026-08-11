"use client";

import { useEffect, useState } from "react";
import AppSidebar from "./AppSidebar";
import AppTopBar from "./AppTopBar";
import AppMobileTabBar from "./AppMobileTabBar";
import type { ClinicIdentity, ClinicShellContext } from "@/lib/clinic-types";
import { AppBranchProvider } from "./AppBranchContext";

export default function AppShell({
  children,
  identity,
  context,
}: {
  children: React.ReactNode;
  identity: ClinicIdentity;
  context: ClinicShellContext;
}) {
  const [branchId, setBranchId] = useState(context.initialBranchId);
  useEffect(() => {
    const key = `dentra.branch.${context.clinic.id}`;
    const stored = window.localStorage.getItem(key);
    if (stored && context.branches.some((branch) => branch.id === stored)) setBranchId(stored);
  }, [context.branches, context.clinic.id]);
  function changeBranch(nextBranchId: string) { setBranchId(nextBranchId); window.localStorage.setItem(`dentra.branch.${context.clinic.id}`, nextBranchId); }
  const branch = context.branches.find((item) => item.id === branchId) ?? context.branches[0] ?? null;
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AppSidebar role={identity.role} membershipRole={identity.membershipRole} userName={identity.name} userEmail={identity.email} clinicName={context.clinic.name} branches={context.branches} branchId={branch?.id ?? null} onBranchChange={changeBranch} entitlements={context.entitlements} packageName={context.packageName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppTopBar role={identity.role} membershipRole={identity.membershipRole} userName={identity.name} userEmail={identity.email} clinicName={context.clinic.name} branchName={branch?.name ?? "No active branch"} entitlements={context.entitlements} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <AppBranchProvider value={{ clinicId: context.clinic.id, branchId: branch?.id ?? null, branchName: branch?.name ?? "No active branch" }}>{children}</AppBranchProvider>
        </main>
      </div>
      <AppMobileTabBar role={identity.role} entitlements={context.entitlements} />
    </div>
  );
}
