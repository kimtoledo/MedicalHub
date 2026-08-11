import { Settings, DollarSign, Building2, Users, Globe, Shield } from "lucide-react";
import Link from "next/link";

const settingsCards = [
  {
    href: "/app/settings/services",
    icon: DollarSign,
    label: "Service Pricing",
    description: "Set the price for each dental service offered by your clinic.",
    available: true,
  },
  {
    href: "/app/settings/hmo-payers",
    icon: Shield,
    label: "HMO Payers",
    description: "Configure HMO providers your clinic is accredited with.",
    available: true,
  },
  {
    href: "/app/settings/profile",
    icon: Building2,
    label: "Clinic Profile",
    description: "Update clinic name, address, contact details, and logo.",
    available: false,
  },
  {
    href: "/app/settings/staff",
    icon: Users,
    label: "Staff & Roles",
    description: "Invite staff, assign roles, and manage clinic access.",
    available: false,
  },
  {
    href: "/app/settings/microsite",
    icon: Globe,
    label: "Public Microsite",
    description: "Customise your clinic's public booking page.",
    available: false,
  },
];

export default function ClinicSettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Settings size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-violet-900">Clinic Settings</h1>
          <p className="text-violet-500 text-sm mt-0.5">Manage your clinic configuration</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {settingsCards.map((card) => {
          const Icon = card.icon;
          if (!card.available) {
            return (
              <div
                key={card.label}
                className="relative bg-white rounded-2xl border border-violet-100 p-5 opacity-50 cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-violet-900 text-sm">{card.label}</p>
                    <p className="text-violet-500 text-xs mt-0.5">{card.description}</p>
                  </div>
                </div>
                <span className="absolute top-3 right-3 text-[10px] font-semibold text-violet-400 bg-violet-50 px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              </div>
            );
          }
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group bg-white rounded-2xl border border-violet-100 hover:border-violet-300 hover:shadow-sm p-5 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Icon size={18} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-violet-900 text-sm group-hover:text-violet-700">{card.label}</p>
                  <p className="text-violet-500 text-xs mt-0.5">{card.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
