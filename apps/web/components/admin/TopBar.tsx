"use client";

import { useState } from "react";
import { Menu, X, Bell, Search, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { navItems } from "./Sidebar";
import Link from "next/link";
import { signOutAdmin } from "@/lib/admin-auth-client";
import type { AdminIdentity } from "@/lib/admin-types";
import DentraLogo from "@/components/brand/DentraLogo";

function getPageTitle(pathname: string) {
  const item = navItems.find((n) =>
    n.href === "/dentra-admin" ? pathname === n.href : pathname.startsWith(n.href)
  );
  return item?.label ?? "Super Admin";
}

export default function TopBar({ admin }: { admin: AdminIdentity }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title = getPageTitle(pathname);

  const isActive = (href: string) =>
    href === "/dentra-admin" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Top bar */}
      <header className="h-16 bg-white border-b border-violet-100 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-30">
        {/* Left: hamburger (mobile/tablet) + title */}
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden text-violet-600 hover:text-violet-800 transition-colors"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="font-bold text-violet-900 text-lg">{title}</h1>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full hover:bg-violet-50 text-violet-500 transition-colors">
            <Search size={18} />
          </button>
          <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-violet-50 text-violet-500 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer ml-1">
            SA
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile slide-in drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-violet-950 text-white flex flex-col
          transform transition-transform duration-300 lg:hidden
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-violet-800">
          <DentraLogo variant="white" className="h-11 w-auto" />
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-violet-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? "bg-violet-600 text-white shadow-lg"
                    : "text-violet-300 hover:bg-violet-800/60 hover:text-white"
                  }
                `}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="p-4 border-t border-violet-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold">
              SA
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{admin.name}</p>
              <p className="text-xs text-violet-400">{admin.email}</p>
            </div>
          </div>
          <button
            onClick={() => void signOutAdmin()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-violet-400 hover:bg-violet-800/60 hover:text-white transition-all"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
