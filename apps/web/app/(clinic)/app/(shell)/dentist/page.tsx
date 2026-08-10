import { Clock, Users, CalendarCheck, ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  confirmed:   "bg-violet-100 text-violet-700",
  checked_in:  "bg-emerald-100 text-emerald-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed:   "bg-slate-100 text-slate-600",
  pending:     "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed:   "Confirmed",
  checked_in:  "Checked In",
  in_progress: "In Progress",
  completed:   "Completed",
  pending:     "Pending",
};

const todaySchedule = [
  { time: "09:00", patient: "Maria Santos",    service: "Dental Check-up",      status: "completed",   branch: "Main Branch" },
  { time: "09:45", patient: "Jose Dela Cruz",  service: "Tooth Extraction",     status: "completed",   branch: "Main Branch" },
  { time: "10:30", patient: "Ana Ramos",       service: "Cleaning & Polishing", status: "in_progress", branch: "Main Branch" },
  { time: "11:15", patient: "Pedro Aquino",    service: "Dental X-Ray",         status: "checked_in",  branch: "Main Branch" },
  { time: "13:30", patient: "Liza Mendoza",    service: "Braces Adjustment",    status: "confirmed",   branch: "BGC Branch"  },
  { time: "14:30", patient: "Carlo Bautista",  service: "Cavity Filling",       status: "confirmed",   branch: "BGC Branch"  },
];

const nextAppointment = todaySchedule.find(
  (a) => a.status === "checked_in" || a.status === "confirmed"
) ?? todaySchedule[3];

const recentPatients = [
  { name: "Maria Santos",   lastVisit: "Today",        service: "Check-up",         initials: "MS" },
  { name: "Jose Dela Cruz", lastVisit: "Today",        service: "Extraction",       initials: "JD" },
  { name: "Ana Ramos",      lastVisit: "Today",        service: "Cleaning",         initials: "AR" },
  { name: "Rosa Garcia",    lastVisit: "2 days ago",   service: "Root Canal",       initials: "RG" },
  { name: "Mark Villanueva",lastVisit: "Last week",    service: "Check-up",         initials: "MV" },
];

export default function DentistDashboardPage() {
  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const completed  = todaySchedule.filter((a) => a.status === "completed").length;
  const remaining  = todaySchedule.filter((a) => a.status !== "completed").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-violet-900">Good morning, Dr. Santos 👋</h1>
        <p className="text-violet-500 text-sm mt-0.5">{today}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-violet-50 p-4 shadow-sm">
          <div className="inline-flex p-2 rounded-xl bg-violet-100 text-violet-600 mb-3">
            <CalendarCheck size={18} />
          </div>
          <p className="text-2xl font-bold text-violet-900">{todaySchedule.length}</p>
          <p className="text-xs font-semibold text-violet-700 mt-0.5">Total Today</p>
        </div>
        <div className="bg-white rounded-2xl border border-violet-50 p-4 shadow-sm">
          <div className="inline-flex p-2 rounded-xl bg-emerald-100 text-emerald-600 mb-3">
            <Clock size={18} />
          </div>
          <p className="text-2xl font-bold text-violet-900">{completed}</p>
          <p className="text-xs font-semibold text-violet-700 mt-0.5">Completed</p>
        </div>
        <div className="bg-white rounded-2xl border border-violet-50 p-4 shadow-sm">
          <div className="inline-flex p-2 rounded-xl bg-amber-100 text-amber-600 mb-3">
            <Users size={18} />
          </div>
          <p className="text-2xl font-bold text-violet-900">{remaining}</p>
          <p className="text-xs font-semibold text-violet-700 mt-0.5">Remaining</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Schedule */}
        <div className="xl:col-span-2 space-y-4">

          {/* Next up */}
          {nextAppointment && (
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-2xl p-5 text-white shadow-lg shadow-violet-200">
              <p className="text-violet-200 text-xs font-semibold uppercase tracking-wide mb-3">Next Up</p>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xl font-bold">{nextAppointment.patient}</p>
                  <p className="text-violet-200 text-sm mt-0.5">{nextAppointment.service}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Clock size={14} /> {nextAppointment.time}
                    </span>
                    <span className="text-violet-300 text-sm">{nextAppointment.branch}</span>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {nextAppointment.patient.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
              </div>
            </div>
          )}

          {/* Today's schedule */}
          <div className="bg-white rounded-2xl border border-violet-50 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-violet-50">
              <h2 className="font-bold text-violet-900">Today&apos;s Schedule</h2>
              <Link href="/app/dentist/schedule" className="text-xs text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1 transition-colors">
                Full view <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-violet-50">
              {todaySchedule.map((appt, i) => (
                <div key={i} className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${appt.status === "completed" ? "opacity-50" : "hover:bg-violet-50/40"}`}>
                  <p className="text-sm font-bold text-violet-900 w-12 flex-shrink-0">{appt.time}</p>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-violet-900 truncate">{appt.patient}</p>
                    <p className="text-xs text-violet-400 truncate">{appt.service} · {appt.branch}</p>
                  </div>
                  <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[appt.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[appt.status] ?? appt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent patients */}
        <div className="bg-white rounded-2xl border border-violet-50 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-violet-50">
            <h2 className="font-bold text-violet-900">Recent Patients</h2>
            <Link href="/app/dentist/patients" className="text-xs text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1 transition-colors">
              All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-violet-50">
            {recentPatients.map((patient, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-violet-50/40 transition-colors cursor-pointer group">
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold flex-shrink-0">
                  {patient.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-violet-900 truncate">{patient.name}</p>
                  <p className="text-xs text-violet-400 truncate">{patient.service} · {patient.lastVisit}</p>
                </div>
                <ChevronRight size={14} className="text-violet-300 group-hover:text-violet-500 flex-shrink-0 transition-colors" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
