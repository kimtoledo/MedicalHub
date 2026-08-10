import {
  Building2,
  CreditCard,
  Stethoscope,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserPlus,
  Package,
} from "lucide-react";
import Link from "next/link";

const kpis = [
  {
    label: "Total Clinics",
    value: "48",
    change: "+3 this month",
    positive: true,
    icon: Building2,
    color: "bg-violet-100 text-violet-600",
  },
  {
    label: "Active Subscriptions",
    value: "36",
    change: "75% of clinics",
    positive: true,
    icon: CreditCard,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    label: "Dentist Profiles",
    value: "127",
    change: "+11 this month",
    positive: true,
    icon: Stethoscope,
    color: "bg-blue-100 text-blue-600",
  },
  {
    label: "Total Appointments",
    value: "2,840",
    change: "+284 vs last week",
    positive: true,
    icon: CalendarCheck,
    color: "bg-amber-100 text-amber-600",
  },
];

const recentActivity = [
  {
    title: "Clinic activated",
    detail: "Sunshine Dental Makati",
    time: "2 min ago",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
  },
  {
    title: "Package assigned",
    detail: "Clinic Pro → BrightSmile Ortigas",
    time: "14 min ago",
    icon: Package,
    iconClass: "text-violet-500",
  },
  {
    title: "New dentist profile",
    detail: "Dr. Miguel Torres created",
    time: "1 hr ago",
    icon: UserPlus,
    iconClass: "text-blue-500",
  },
  {
    title: "Subscription expired",
    detail: "Basic plan — QuickCare Clinic",
    time: "2 hrs ago",
    icon: AlertCircle,
    iconClass: "text-amber-500",
  },
  {
    title: "Feature override added",
    detail: "Premier Dental — inventory.manage",
    time: "5 hrs ago",
    icon: TrendingUp,
    iconClass: "text-violet-500",
  },
  {
    title: "Microsite published",
    detail: "ClearSmile Dental BGC",
    time: "Yesterday",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
  },
];

const clinicStatus = [
  { label: "Active",    count: 36, color: "bg-emerald-500" },
  { label: "Trial",     count: 8,  color: "bg-amber-400"   },
  { label: "Suspended", count: 3,  color: "bg-red-400"     },
  { label: "Archived",  count: 1,  color: "bg-slate-400"   },
];

const quickActions = [
  { label: "Add Clinic",      href: "/th-admin/clinics",       icon: Building2   },
  { label: "Add Dentist",     href: "/th-admin/dentists",      icon: Stethoscope },
  { label: "Manage Packages", href: "/th-admin/packages",      icon: Package     },
  { label: "View Audit Log",  href: "/th-admin/audit",         icon: Clock       },
];

export default function AdminDashboardPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-violet-900">Good morning, Admin 👋</h1>
        <p className="text-violet-500 text-sm mt-1">
          Here&apos;s what&apos;s happening on the platform today.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-2xl border border-violet-50 p-5 shadow-sm">
              <div className={`inline-flex p-2.5 rounded-xl ${kpi.color} mb-4`}>
                <Icon size={20} />
              </div>
              <p className="text-2xl font-bold text-violet-900">{kpi.value}</p>
              <p className="text-xs text-violet-500 font-medium mt-0.5">{kpi.label}</p>
              <p className={`text-xs font-semibold mt-2 ${kpi.positive ? "text-emerald-600" : "text-red-500"}`}>
                {kpi.positive ? "↑ " : "↓ "}{kpi.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent activity */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-violet-50 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-violet-50">
            <h2 className="font-bold text-violet-900">Recent Activity</h2>
            <Link
              href="/th-admin/audit"
              className="text-xs text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-violet-50">
            {recentActivity.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-4 hover:bg-violet-50/50 transition-colors">
                  <div className={`mt-0.5 flex-shrink-0 ${item.iconClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-violet-900">{item.title}</p>
                    <p className="text-xs text-violet-500 truncate">{item.detail}</p>
                  </div>
                  <span className="text-xs text-violet-400 flex-shrink-0 mt-0.5">{item.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Clinic status breakdown */}
          <div className="bg-white rounded-2xl border border-violet-50 shadow-sm p-5">
            <h2 className="font-bold text-violet-900 mb-4">Clinic Status</h2>
            <div className="space-y-3">
              {clinicStatus.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.color}`} />
                  <span className="text-sm text-violet-700 flex-1">{s.label}</span>
                  <span className="text-sm font-bold text-violet-900">{s.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-2 rounded-full overflow-hidden gap-0.5">
              {clinicStatus.map((s) => (
                <div key={s.label} className={`${s.color} rounded-full`} style={{ flex: s.count }} />
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-violet-50 shadow-sm p-5">
            <h2 className="font-bold text-violet-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="flex flex-col items-center gap-2 p-3 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors text-center group"
                  >
                    <div className="w-9 h-9 bg-violet-600 group-hover:bg-violet-700 rounded-xl flex items-center justify-center transition-colors">
                      <Icon size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-violet-700 leading-tight">{a.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
