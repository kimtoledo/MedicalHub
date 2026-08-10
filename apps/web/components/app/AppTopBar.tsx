"use client";

import { useState } from "react";
import { Menu, X, Bell, Search, LogOut, Building2, CalendarDays, Users, UserCog, Settings, UserCircle, CalendarCheck, ClipboardList, Grid3X3, Stethoscope } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { type ClinicRole, signOut } from "./ClinicAuthGuard";

const clinicNavItems = [
  { label: "Dashboard",       href: "/app",              icon: Building2,     exact: true },
  { label: "Appointments",    href: "/app/appointments", icon: CalendarDays  },
  { label: "Patients",        href: "/app/patients",     icon: Users         },
  { label: "Staff",           href: "/app/staff",        icon: UserCog       },
  { label: "Clinic Settings", href: "/app/settings",     icon: Settings      },
  { label: "My Profile",      href: "/app/profile",      icon: UserCircle    },
];

const dentistNavItems = [
  { label: "My Schedule", href: "/app/dentist",            icon: CalendarCheck, exact: true },
  { label: "My Patients", href: "/app/dentist/patients",   icon: Users          },
  { label: "Encounters",  href: "/app/dentist/encounters", icon: ClipboardList  },
  { label: "Odontogram",  href: "/app/dentist/odontogram", icon: Grid3X3        },
  { label: "My Profile",  href: "/app/dentist/profile",    icon: UserCircle     },
];

function getPageTitle(pathname: string, role: ClinicRole) {
  const items = role === "dentist" ? dentistNavItems : clinicNavItems;
  const item = items.find((n) =>
    n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/")
  );
  return item?.label ?? "Dashboard";
}

interface AppTopBarProps {
  role: ClinicRole;
  clinicName?: string;
  userEmail?: string;
}

export default function AppTopBar({ role, clinicName = "Sunshine Dental", userEmail = "staff@clinic.ph" }: AppTopBarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title = getPageTitle(pathname, role);
  const navItems = role === "dentist" ? dentistNavItems : clinicNavItems;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const initials = role === "dentist" ? "Dr" : "ST";

  return (
    <>
      <header className="h-16 bg-white border-b border-violet-100 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden text-violet-600 hover:text-violet-800 transition-colors"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div>
            <h1 className="font-bold text-violet-900 text-base leading-tight">{title}</h1>
            <p className="text-violet-400 text-xs hidden sm:block">{clinicName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full hover:bg-violet-50 text-violet-500 transition-colors">
            <Search size={18} />
          </button>
          <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-violet-50 text-violet-500 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer ml-1">
            {initials}
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-violet-950 text-white flex flex-col transform transition-transform duration-300 lg:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-violet-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">TH</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">{clinicName}</p>
              <p className="text-violet-400 text-xs font-medium flex items-center gap-1">
                {role === "dentist" && <Stethoscope size={10} />}
                {role === "dentist" ? "Dentist view" : "Clinic staff"}
              </p>
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="text-violet-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? "bg-violet-600 text-white" : "text-violet-300 hover:bg-violet-800/60 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-violet-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold">{initials}</div>
            <div>
              <p className="text-sm font-semibold text-white">{role === "dentist" ? "Dr. Santos" : "Clinic Staff"}</p>
              <p className="text-xs text-violet-400">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-violet-400 hover:bg-violet-800/60 hover:text-white transition-all"
          >
            <LogOut size={16} />Sign out
          </button>
        </div>
      </div>
    </>
  );
}
