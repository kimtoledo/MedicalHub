import Link from "next/link";
import { DollarSign, Settings, Shield } from "lucide-react";
import ClinicMicrositeSettings from "@/components/app/ClinicMicrositeSettings";
import { getClinicSession } from "@/lib/clinic-session";
import { getClinicSettings } from "@/lib/clinic-settings";

const operationalSettings = [
  {
    href: "/app/settings/services",
    icon: DollarSign,
    label: "Service Pricing",
    description: "Set the price for each dental service offered by your clinic.",
  },
  {
    href: "/app/settings/hmo-payers",
    icon: Shield,
    label: "HMO Payers",
    description: "Configure HMO providers your clinic is accredited with.",
  },
];

export default async function ClinicSettingsPage() {
  const identity = await getClinicSession();
  const settings = identity ? await getClinicSettings(identity.clinicId) : null;

  if (!identity || !settings) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <h1 className="font-semibold">Clinic settings unavailable</h1>
          <p className="mt-1 text-sm">Clinic Owner or Admin access is required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
            <Settings className="text-violet-600" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clinic Settings</h1>
            <p className="text-sm text-slate-500">
              Manage operations, pricing, payer records, and your public microsite.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {operationalSettings.map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-violet-100 bg-white p-5 transition-all hover:border-violet-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 transition-colors group-hover:bg-violet-200">
                  <Icon size={18} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-900">{label}</p>
                  <p className="mt-0.5 text-xs text-violet-500">{description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <ClinicMicrositeSettings clinicId={identity.clinicId} settings={settings} />
      </div>
    </div>
  );
}
