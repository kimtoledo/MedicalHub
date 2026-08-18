"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, UserCircle, CalendarCheck, ClipboardList, Grid3X3, Receipt } from "lucide-react";
import { type ClinicRole } from "@/lib/clinic-types";

const clinicTabs = [
  { label: "Today",         href: "/app",              icon: LayoutDashboard, exact: true },
  { label: "Appointments",  href: "/app/appointments", icon: CalendarDays, feature: "appointments.manage", permission: "appointments.manage" },
  { label: "Patients",      href: "/app/patients",     icon: Users, feature: "patients.manage", permission: "patients.manage" },
  { label: "Billing",       href: "/app/billing",      icon: Receipt, feature: "billing.invoices", permission: "billing.invoices" },
  { label: "Profile",       href: "/app/profile",      icon: UserCircle     },
];

const dentistTabs = [
  { label: "Schedule",   href: "/app/dentist",            icon: CalendarCheck, exact: true, feature: "appointments.calendar", permission: "appointments.manage" },
  { label: "Patients",   href: "/app/dentist/patients",   icon: Users, feature: "patients.manage", permission: "patients.manage" },
  { label: "Encounters", href: "/app/dentist/encounters", icon: ClipboardList, feature: "clinical.encounters", permission: "clinical.records" },
  { label: "Odontogram", href: "/app/dentist/odontogram", icon: Grid3X3, feature: "clinical.odontogram", permission: "clinical.records" },
  { label: "Profile",    href: "/app/dentist/profile",    icon: UserCircle    },
];

export default function AppMobileTabBar({ role, entitlements, permissions }: { role: ClinicRole; entitlements: Record<string, boolean>; permissions: string[] }) {
  const pathname = usePathname();
  const tabs = (role === "dentist" ? dentistTabs : clinicTabs).filter((item) => {
    const hasFeature = !("feature" in item) || !item.feature || entitlements[item.feature];
    const hasPermission = !("permission" in item) || !item.permission || permissions.includes(item.permission);
    return hasFeature && hasPermission;
  });

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-violet-100 flex">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href, tab.exact);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              active ? "text-violet-600" : "text-violet-400 hover:text-violet-600"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px]">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
