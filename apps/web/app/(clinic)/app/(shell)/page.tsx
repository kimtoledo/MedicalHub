import {
  CalendarDays,
  UserCheck,
  Clock,
  Banknote,
  Plus,
  LogIn,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const STATUS_STYLES: Record<string, string> = {
  confirmed:   "bg-violet-100 text-violet-700",
  checked_in:  "bg-emerald-100 text-emerald-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed:   "bg-slate-100 text-slate-600",
  pending:     "bg-amber-100 text-amber-700",
  cancelled:   "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed:   "Confirmed",
  checked_in:  "Checked In",
  in_progress: "In Progress",
  completed:   "Completed",
  pending:     "Pending",
  cancelled:   "Cancelled",
};

// Mock appointment data (real data wired in the appointments task)
const todayAppointments = [
  { time: "08:00", patient: "Maria Santos",    service: "Prophylaxis",        dentist: "Dr. Reyes",  status: "completed"   },
  { time: "09:00", patient: "Jose Dela Cruz",  service: "Tooth Extraction",   dentist: "Dr. Santos", status: "completed"   },
  { time: "09:30", patient: "Ana Ramos",       service: "Composite Filling",  dentist: "Dr. Reyes",  status: "in_progress" },
  { time: "10:00", patient: "Pedro Aquino",    service: "Dental X-Ray",       dentist: "Dr. Lim",    status: "checked_in"  },
  { time: "10:30", patient: "Liza Mendoza",    service: "Root Canal",         dentist: "Dr. Santos", status: "checked_in"  },
  { time: "11:00", patient: "Carlo Bautista",  service: "Teeth Whitening",    dentist: "Dr. Reyes",  status: "confirmed"   },
  { time: "13:00", patient: "Rosa Garcia",     service: "Prophylaxis",        dentist: "Dr. Lim",    status: "confirmed"   },
  { time: "14:30", patient: "Mark Villanueva", service: "Composite Filling",  dentist: "Dr. Santos", status: "pending"     },
];

const quickActions = [
  { label: "New Patient", href: "/app/patients",     icon: Plus,        color: "bg-violet-600 hover:bg-violet-700" },
  { label: "Book Slot",   href: "/app/appointments", icon: CalendarPlus,color: "bg-blue-600 hover:bg-blue-700"     },
  { label: "Check In",    href: "/app/appointments", icon: LogIn,       color: "bg-emerald-600 hover:bg-emerald-700" },
];

async function fetchTodayEarnings(
  clinicId: string,
  cookieHeader: string,
): Promise<{ totalPhp: string; invoiceCount: number } | null> {
  try {
    const url = getBackendUrl(`/v1/clinic/${clinicId}/earnings/today`);
    const res = await fetch(url, { headers: { cookie: cookieHeader }, cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json() as { success: boolean; data: { totalPhp: string; invoiceCount: number } };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

export default async function ClinicDashboardPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const cookieHeader = cookies().toString();
  const earnings = await fetchTodayEarnings(identity.clinicId, cookieHeader);

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const earningsPhp = earnings
    ? `₱${parseFloat(earnings.totalPhp).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
    : "₱0.00";
  const earningsSub = earnings
    ? `${earnings.invoiceCount} invoice${earnings.invoiceCount !== 1 ? "s" : ""} today`
    : "No payments yet today";

  const kpis = [
    { label: "Today's Appointments", value: "12",       sub: "Scheduled for today",      icon: CalendarDays,     color: "bg-violet-100 text-violet-600" },
    { label: "Checked In",           value: "4",        sub: "Currently in clinic",      icon: UserCheck,        color: "bg-emerald-100 text-emerald-600" },
    { label: "Upcoming",             value: "8",        sub: "Yet to arrive",            icon: Clock,            color: "bg-amber-100 text-amber-600" },
    { label: "Today's Collections",  value: earningsPhp,sub: earningsSub,               icon: Banknote,         color: "bg-green-100 text-green-600" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-900">Good morning! 👋</h1>
          <p className="text-violet-500 text-sm mt-0.5">{today}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold transition-colors ${a.color}`}
              >
                <Icon size={15} />
                {a.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile quick actions */}
      <div className="flex gap-2 sm:hidden">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              href={a.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-white text-xs font-semibold transition-colors ${a.color}`}
            >
              <Icon size={18} />
              {a.label}
            </Link>
          );
        })}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm border border-violet-50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-violet-400 truncate">{kpi.label}</p>
                  <p className="text-xl font-bold text-violet-900 mt-1 truncate">{kpi.value}</p>
                  <p className="text-xs text-violet-400 mt-0.5 truncate">{kpi.sub}</p>
                </div>
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${kpi.color}`}>
                  <Icon size={17} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's appointments */}
      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-violet-50">
          <h2 className="font-bold text-violet-900">Today&apos;s Schedule</h2>
          <Link href="/app/appointments" className="text-xs text-violet-500 hover:text-violet-700 font-semibold flex items-center gap-1">
            View all
          </Link>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-violet-500 font-semibold border-b border-violet-50">
                <th className="px-5 py-3 text-left">Time</th>
                <th className="px-5 py-3 text-left">Patient</th>
                <th className="px-5 py-3 text-left">Service</th>
                <th className="px-5 py-3 text-left">Dentist</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {todayAppointments.map((appt, i) => (
                <tr key={i} className="hover:bg-violet-50/40 transition-colors">
                  <td className="px-5 py-3 font-semibold text-violet-900">{appt.time}</td>
                  <td className="px-5 py-3 text-violet-800">{appt.patient}</td>
                  <td className="px-5 py-3 text-violet-600">{appt.service}</td>
                  <td className="px-5 py-3 text-violet-500">{appt.dentist}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[appt.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[appt.status] ?? appt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-violet-50">
          {todayAppointments.map((appt, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="text-center flex-shrink-0 w-12">
                <p className="text-sm font-bold text-violet-900">{appt.time}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-violet-900 truncate">{appt.patient}</p>
                <p className="text-xs text-violet-500 truncate">{appt.service} · {appt.dentist}</p>
              </div>
              <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[appt.status] ?? "bg-slate-100 text-slate-600"}`}>
                {STATUS_LABELS[appt.status] ?? appt.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
