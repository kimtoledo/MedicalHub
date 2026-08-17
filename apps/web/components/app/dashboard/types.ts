export type DashboardAppointment = {
  id: string;
  branchId: string;
  branchName: string;
  patientId: string | null;
  patientFirstName: string;
  patientLastName: string;
  patientNumber: string | null;
  dentistId: string | null;
  dentistFirstName: string | null;
  dentistLastName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  serviceWorkflowMode: "quick" | "standard" | null;
  status: string;
  startsAt: string;
  endsAt: string | null;
  chiefComplaint: string | null;
};
export type DashboardSummary = {
  todayAppointmentCount: number;
  checkedInCount: number;
  upcomingCount: number;
  activePatientCount: number;
  appointments: DashboardAppointment[];
};
export type RecentPatient = {
  patientId: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  serviceName: string | null;
  lastVisit: string;
};
export const todayManila = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const addDays = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};
export const mondayOf = (value: string) => {
  const weekday = new Date(`${value}T12:00:00+08:00`).getUTCDay();
  return addDays(value, weekday === 0 ? -6 : 1 - weekday);
};
export const dayLabel = (value: string) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00+08:00`));
export const weekRangeLabel = (weekStart: string) =>
  `${dayLabel(weekStart)} – ${dayLabel(addDays(weekStart, 6))}`;
export const time = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
export const statusStyle = (status: string) =>
  ({
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-violet-100 text-violet-700",
    checked_in: "bg-emerald-100 text-emerald-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-orange-100 text-orange-700",
  })[status] ?? "bg-slate-100 text-slate-600";
