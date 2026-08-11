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
} from "lucide-react";
import { type ClinicRole } from "@/lib/clinic-types";
import { signOutClinic } from "@/lib/clinic-auth-client";
import DentraLogo from "@/components/brand/DentraLogo";

const clinicNavItems = [
  { label: "Dashboard",        href: "/app",                  icon: LayoutDashboard, exact: true },
  { label: "Appointments",     href: "/app/appointments",     icon: CalendarDays  },
  { label: "Patients",         href: "/app/patients",         icon: Users         },
  { label: "Encounters",       href: "/app/encounters",       icon: ClipboardList },
  { label: "Prescriptions",    href: "/app/prescriptions",    icon: FileText      },
  { label: "Billing",          href: "/app/billing",          icon: Receipt       },
  { label: "HMO Claims",       href: "/app/billing/hmo-claims", icon: Shield        },
  { label: "Staff",            href: "/app/staff",            icon: UserCog       },
  { label: "Clinic Settings",  href: "/app/settings",         icon: Settings      },
  { label: "My Profile",       href: "/app/profile",          icon: UserCircle    },
];

const dentistNavItems = [
  { label: "My Schedule",    href: "/app/dentist",                  icon: CalendarCheck, exact: true },
  { label: "My Patients",    href: "/app/dentist/patients",         icon: Users          },
  { label: "Encounters",     href: "/app/encounters",               icon: ClipboardList  },
  { label: "Prescriptions",  href: "/app/prescriptions",            icon: FileText       },
  { label: "Odontogram",     href: "/app/dentist/odontogram",       icon: Grid3X3        },
  { label: "Remote Consults", href: "/app/dentist/remote-consults", icon: Camera         },
  { label: "My Profile",     href: "/app/dentist/profile",          icon: UserCircle     },
];

interface AppSidebarProps {
  role: ClinicRole;
  clinicName?: string;
  branchName?: string;
  userEmail?: string;
}

export default function AppSidebar({
  role,
  clinicName = "Sunshine Dental",
  branchName = "Main Branch",
  userEmail = "staff@clinic.ph",
}: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = role === "dentist" ? dentistNavItems : clinicNavItems;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const initials = role === "dentist" ? "Dr" : "ST";

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
            <button className="w-full flex items-center justify-between bg-violet-900/60 hover:bg-violet-800/60 px-2.5 py-1.5 rounded-lg transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 size={13} className="text-violet-400 flex-shrink-0" />
                <span className="text-violet-200 text-xs font-medium truncate">{branchName}</span>
              </div>
              <ChevronDown size={13} className="text-violet-400 flex-shrink-0" />
            </button>
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
                {role === "dentist" ? "Dr. Santos" : "Clinic Staff"}
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
