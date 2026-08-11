"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Package,
  CreditCard,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { signOutAdmin } from "@/lib/admin-auth-client";
import type { AdminIdentity } from "@/lib/admin-types";
import DentraLogo from "@/components/brand/DentraLogo";

export const navItems = [
  { label: "Dashboard",        href: "/dentra-admin",              icon: LayoutDashboard },
  { label: "Clinics",          href: "/dentra-admin/clinics",      icon: Building2 },
  { label: "Dentists",         href: "/dentra-admin/dentists",     icon: Stethoscope },
  { label: "Packages & Plans", href: "/dentra-admin/packages",     icon: Package },
  { label: "Subscriptions",    href: "/dentra-admin/subscriptions",icon: CreditCard },
  { label: "Audit Log",        href: "/dentra-admin/audit",        icon: ScrollText },
  { label: "Settings",         href: "/dentra-admin/settings",     icon: Settings },
];

interface SidebarProps {
  /** Controlled from parent for mobile drawer */
  collapsed?: boolean;
  admin: AdminIdentity;
}

export default function Sidebar({ admin, collapsed: externalCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isCollapsed = externalCollapsed ?? collapsed;

  const isActive = (href: string) =>
    href === "/dentra-admin" ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className={`
        hidden lg:flex flex-col h-screen bg-violet-950 text-white transition-all duration-300 flex-shrink-0
        ${isCollapsed ? "w-16" : "w-60"}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-violet-800 ${isCollapsed ? "justify-center" : "gap-3"}`}>
        <DentraLogo
          variant={isCollapsed ? "icon" : "white"}
          className={isCollapsed ? "h-9 w-9" : "h-11 w-auto"}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                  : "text-violet-300 hover:bg-violet-800/60 hover:text-white"
                }
                ${isCollapsed ? "justify-center" : ""}
              `}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-violet-800 space-y-1">
        {/* Admin info */}
        {!isCollapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              SA
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{admin.name}</p>
              <p className="text-xs text-violet-400 truncate">{admin.email}</p>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={() => void signOutAdmin()}
          title={isCollapsed ? "Sign out" : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            text-violet-400 hover:bg-violet-800/60 hover:text-white transition-all
            ${isCollapsed ? "justify-center" : ""}
          `}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!isCollapsed && <span>Sign out</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium
            text-violet-500 hover:bg-violet-800/40 hover:text-violet-300 transition-all
            ${isCollapsed ? "justify-center" : ""}
          `}
        >
          {isCollapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}
