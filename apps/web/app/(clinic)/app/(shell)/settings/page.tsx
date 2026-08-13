import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, BadgeCheck, BarChart3, BellRing, CreditCard, DollarSign, MessageSquare, Settings, Shield } from "lucide-react";
import ClinicMicrositeSettings from "@/components/app/ClinicMicrositeSettings";
import AppPageError from "@/components/app/AppPageError";
import { getClinicSession } from "@/lib/clinic-session";
import { ClinicSettingsLoadError, getClinicSettings, type ClinicSettings } from "@/lib/clinic-settings";
import { classifyClinicSettingsError } from "@/lib/clinic-settings-error";

const operationalSettings = [
  {
    href: "/app/settings/reviews",
    icon: MessageSquare,
    label: "Patient Reviews",
    description: "Read approved reviews and publish a clinic response.",
  },
  {
    href: "/app/settings/verification",
    icon: BadgeCheck,
    label: "Clinic Verification",
    description: "Submit permits and track private verification review.",
  },
  {
    href: "/app/settings/subscription",
    icon: CreditCard,
    label: "Subscription",
    description: "View feature access and request a package change.",
  },
  {
    href: "/app/reports",
    icon: BarChart3,
    label: "Reports",
    description: "Review clinic operations, collections, and stock summaries.",
  },
  {
    href: "/app/recalls",
    icon: BellRing,
    label: "Recall Queue",
    description: "Review due follow-ups and contact patients about their next visit.",
  },
  {
    href: "/app/settings/services",
    icon: DollarSign,
    label: "Service Pricing",
    description: "Set the price for each dental service offered by your clinic.",
  },
  {
    href: "/app/settings/inventory",
    icon: Archive,
    label: "Inventory",
    description: "Track stock, reorder levels, batches, and expiry alerts.",
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

  if (!identity) {
    redirect("/cl-login");
  }

  if (!identity.isAdmin) {
    return <AppPageError title="Clinic settings restricted" message="Clinic Owner or Admin access is required." kind="forbidden" />;
  }

  let settings: ClinicSettings;
  try {
    settings = await getClinicSettings(identity.clinicId);
  } catch (caught) {
    const kind = caught instanceof ClinicSettingsLoadError
      ? classifyClinicSettingsError(caught.status)
      : "service";

    if (kind === "unauthenticated") {
      redirect("/cl-login");
    }
    if (kind === "forbidden") {
      return <AppPageError title="Clinic settings restricted" message="Your current clinic role does not allow settings access." kind="forbidden" />;
    }
    if (kind === "not-found") {
      return <AppPageError title="Clinic not found" message="This clinic is unavailable or no longer active." kind="not-found" />;
    }
    return (
      <AppPageError
        title="Clinic settings temporarily unavailable"
        message="The server could not load clinic settings. Ask an administrator to confirm database migrations are current, then retry."
      />
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
