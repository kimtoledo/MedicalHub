"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Stethoscope, Package, Settings } from "lucide-react";

const tabItems = [
  { label: "Dashboard", href: "/th-admin",        icon: LayoutDashboard },
  { label: "Clinics",   href: "/th-admin/clinics", icon: Building2 },
  { label: "Dentists",  href: "/th-admin/dentists",icon: Stethoscope },
  { label: "Packages",  href: "/th-admin/packages",icon: Package },
  { label: "Settings",  href: "/th-admin/settings",icon: Settings },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/th-admin" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-violet-100 flex">
      {tabItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors
              ${active ? "text-violet-600" : "text-violet-400 hover:text-violet-600"}
            `}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className="hidden xs:block">{item.label}</span>
            {active && (
              <span className="absolute top-0 w-8 h-0.5 bg-violet-600 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
