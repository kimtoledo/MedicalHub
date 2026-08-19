"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Settings,
  UserCircle,
  CalendarCheck,
  ClipboardList,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  Building2,
  Receipt,
  Stethoscope,
  FileText,
  Camera,
  Shield,
  Network,
  BarChart3,
  ArrowLeftRight,
} from "lucide-react";
import { type ClinicBranchContext, type ClinicRole } from "@/lib/clinic-types";
import { signOutClinic } from "@/lib/clinic-auth-client";
import DentraLogo from "@/components/brand/DentraLogo";

const clinicNavItems = [
  { label: "Today",           href: "/app",                    icon: LayoutDashboard, exact: true },
  { label: "Appointments",    href: "/app/appointments",       icon: CalendarDays, feature: "appointments.manage", permission: "appointments.manage" },
  { label: "Patients",        href: "/app/patients",           icon: Users, feature: "patients.manage", permission: "patients.manage" },
  { label: "Encounters",      href: "/app/encounters",         icon: ClipboardList, feature: "clinical.encounters", permission: "clinical.records", roles: ["clinic_owner", "clinic_admin", "dental_assistant"] },
  { label: "Service Records", href: "/app/treatments",         icon: Stethoscope, feature: "clinical.treatment_records", permission: "clinical.records", roles: ["clinic_owner", "clinic_admin", "dental_assistant"] },
  { label: "Prescriptions",   href: "/app/prescriptions",      icon: FileText, feature: "clinical.prescriptions", permission: "clinical.records", roles: ["clinic_owner", "clinic_admin", "dental_assistant"] },
  { label: "Billing",         href: "/app/billing",            icon: Receipt, feature: "billing.invoices", permission: "billing.invoices" },
  { label: "HMO Claims",      href: "/app/billing/hmo-claims", icon: Shield, feature: "hmo.claims" },
  { label: "Staff",           href: "/app/staff",              icon: UserCog, feature: "staff.manage", roles: ["clinic_owner", "clinic_admin"] },
  { label: "Organization",    href: "/app/organization",       icon: Network, feature: "organizations.manage" },
  { label: "Referrals",       href: "/app/referrals",          icon: ArrowLeftRight, feature: "patients.referrals" },
  { label: "Analytics",       href: "/app/analytics",          icon: BarChart3, feature: "reports.advanced", permission: "reports.basic" },
  { label: "Clinic Settings", href: "/app/settings",           icon: Settings, roles: ["clinic_owner", "clinic_admin"] },
  { label: "My Profile",      href: "/app/profile",            icon: UserCircle },
];

const dentistNavItems = [
  { label: "My Schedule",     href: "/app/dentist",                 icon: CalendarCheck, exact: true, feature: "appointments.calendar", permission: "appointments.manage" },
  { label: "My Patients",     href: "/app/dentist/patients",        icon: Users, feature: "patients.manage", permission: "patients.manage" },
  { label: "Encounters",      href: "/app/dentist/encounters",      icon: ClipboardList, feature: "clinical.encounters", permission: "clinical.records" },
  { label: "Service Records", href: "/app/treatments",              icon: Stethoscope, feature: "clinical.treatment_records", permission: "clinical.records" },
  { label: "Prescriptions",   href: "/app/prescriptions",           icon: FileText, feature: "clinical.prescriptions", permission: "clinical.records" },
  { label: "Odontogram",      href: "/app/dentist/odontogram",      icon: Grid3X3, feature: "clinical.odontogram", permission: "clinical.records" },
  { label: "Remote Consults", href: "/app/dentist/remote-consults", icon: Camera, feature: "teledentistry" },
  { label: "My Profile",      href: "/app/dentist/profile",         icon: UserCircle },
];

interface AppSidebarProps {
  role: ClinicRole;
  membershipRole: string;
  permissions: string[];
  clinicName?: string;
  branches: ClinicBranchContext[];
  branchId: string | null;
  onBranchChange: (branchId: string) => void;
  entitlements: Record<string, boolean>;
  packageName: string | null;
  userName: string;
  userEmail?: string;
}

export default function AppSidebar({
  role,
  membershipRole,
  permissions,
  clinicName = "Clinic",
  branches,
  branchId,
  onBranchChange,
  entitlements,
  packageName,
  userName,
  userEmail = "staff@clinic.ph",
}: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = (role === "dentist" ? dentistNavItems : clinicNavItems).filter((item) => {
    const hasFeature = !("feature" in item) || !item.feature || entitlements[item.feature];
    const hasPermission = !("permission" in item) || !item.permission || permissions.includes(item.permission);
    const hasRole = !("roles" in item) || !item.roles || item.roles.includes(membershipRole);
    return hasFeature && hasPermission && hasRole;
  });

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || (role === "dentist" ? "DR" : "ST");

  return (
    <aside
      className={`
        hidden lg:flex flex-col h-screen bg-violet-950 text-white transition-all duration-300 flex-shrink-0
        ${collapsed ? "w-16" : "w-64"}
      `}
    >
      {/* Clinic context header */}
      <div className={`border-b border-violet-800 flex-shrink-0 ${collapsed ? "px-2 py-3" : "px-4 py-3"}`}>
        {collapsed ? (
          <div className="flex justify-center">
            <DentraLogo variant="icon" className="h-9 w-9" />
          </div>
        ) : (
          <>
            {/* Clinic name */}
            <div className="flex items-center gap-2 mb-2">
              <DentraLogo variant="icon" className="h-8 w-8 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate leading-tight">{clinicName}</p>
                <p className="text-violet-400 text-xs font-medium">Dentra.ph</p>
              </div>
            </div>
            {/* Branch selector */}
            <label className="relative flex w-full items-center bg-violet-900/60 px-2.5 py-2 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 size={13} className="text-violet-400 flex-shrink-0" />
                <span className="sr-only">Active branch</span>
                <select aria-label="Active branch" value={branchId ?? ''} onChange={(event) => onBranchChange(event.target.value)} disabled={branches.length < 2} className="min-w-0 flex-1 appearance-none bg-transparent pr-5 text-xs font-medium text-violet-200 outline-none disabled:cursor-default">{branches.length ? branches.map((branch) => <option key={branch.id} value={branch.id} className="text-slate-900">{branch.name}</option>) : <option value="">No active branch</option>}</select>
              </div>
              {branches.length > 1 && <ChevronDown size={13} className="pointer-events-none absolute right-2 text-violet-400" />}
            </label>
          </>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            role === "dentist"
              ? "bg-teal-500/20 text-teal-300"
              : "bg-violet-500/20 text-violet-300"
          }`}>
            {role === "dentist" ? <Stethoscope size={10} /> : null}
            {role === "dentist" ? "Dentist view" : "Clinic staff"}
          </span>
          {packageName && <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-violet-500">{packageName} package</p>}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                  : "text-violet-300 hover:bg-violet-800/60 hover:text-white"
                }
                ${collapsed ? "justify-center" : ""}
              `}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-violet-800 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {userName}
              </p>
              <p className="text-xs text-violet-400 truncate">{userEmail}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => void signOutClinic()}
          title={collapsed ? "Sign out" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-violet-400 hover:bg-violet-800/60 hover:text-white transition-all ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-violet-500 hover:bg-violet-800/40 hover:text-violet-300 transition-all ${collapsed ? "justify-center" : ""}`}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
