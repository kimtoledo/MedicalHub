import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck, Clock, CreditCard, Package, Stethoscope, UserPlus } from "lucide-react";
import AppPageError from "@/components/app/AppPageError";
import { getAdminDashboard } from "@/lib/admin-dashboard";

const statusStyle = { active: "bg-emerald-500", trial: "bg-amber-400", suspended: "bg-red-400", archived: "bg-slate-400" } as const;
const actionLabel = (value: string) => value.replace(/[._]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const time = (value: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default async function AdminDashboardPage() {
  let data;
  try { data = await getAdminDashboard(); }
  catch { return <AppPageError title="Platform dashboard unavailable" message="The live platform summary could not be loaded. Confirm the API is running, then retry." />; }
  const kpis = [
    { label: "Total Clinics", value: data.metrics.totalClinics, detail: `${data.clinicStatuses.active} active`, icon: Building2, color: "bg-violet-100 text-violet-600" },
    { label: "Current Subscriptions", value: data.metrics.currentSubscriptions, detail: `${data.subscriptionStatuses.active} active · ${data.subscriptionStatuses.trial} trial`, icon: CreditCard, color: "bg-emerald-100 text-emerald-600" },
    { label: "Dentist Profiles", value: data.metrics.totalDentists, detail: "Platform profiles", icon: Stethoscope, color: "bg-blue-100 text-blue-600" },
    { label: "Total Appointments", value: data.metrics.totalAppointments, detail: `${data.metrics.appointmentsLast30Days} in last 30 days`, icon: CalendarCheck, color: "bg-amber-100 text-amber-600" },
  ];
  const quickActions = [
    { label: "Add Clinic", href: "/dentra-admin/clinics/new", icon: Building2 },
    { label: "Manage Dentists", href: "/dentra-admin/dentists", icon: UserPlus },
    { label: "Manage Packages", href: "/dentra-admin/packages", icon: Package },
    { label: "View Audit Log", href: "/dentra-admin/audit", icon: Clock },
  ];
  return <div className="space-y-8 p-4 sm:p-6 lg:p-8">
    <div><h1 className="text-2xl font-bold text-violet-900">Platform Overview</h1><p className="mt-1 text-sm text-violet-500">Live operational totals and recent audited activity.</p></div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{kpis.map(({ label, value, detail, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-violet-50 bg-white p-5 shadow-sm"><div className={`mb-4 inline-flex rounded-xl p-2.5 ${color}`}><Icon size={20} /></div><p className="text-2xl font-bold text-violet-900">{value.toLocaleString("en-PH")}</p><p className="mt-0.5 text-xs font-medium text-violet-500">{label}</p><p className="mt-2 text-xs font-semibold text-slate-500">{detail}</p></div>)}</div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3"><section className="rounded-2xl border border-violet-50 bg-white shadow-sm xl:col-span-2"><div className="flex items-center justify-between border-b border-violet-50 p-5"><h2 className="font-bold text-violet-900">Recent Activity</h2><Link href="/dentra-admin/audit" className="flex items-center gap-1 text-xs font-medium text-violet-600">View all <ArrowRight size={12} /></Link></div>{!data.recentActivity.length && <div className="p-10 text-center text-sm text-slate-500">No audited platform activity yet.</div>}<div className="divide-y divide-violet-50">{data.recentActivity.map((item) => <div key={item.id} className="flex items-start gap-3 p-4"><Clock size={17} className="mt-0.5 shrink-0 text-violet-500" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-violet-900">{actionLabel(item.action)}</p><p className="truncate text-xs text-violet-500">{item.clinicName ?? "Platform"} · {actionLabel(item.entityType)}</p></div><time dateTime={item.occurredAt} className="shrink-0 text-xs text-violet-400">{time(item.occurredAt)}</time></div>)}</div></section>
    <div className="space-y-6"><section className="rounded-2xl border border-violet-50 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-violet-900">Clinic Status</h2><div className="space-y-3">{Object.entries(data.clinicStatuses).map(([status, count]) => <div key={status} className="flex items-center gap-3"><div className={`h-2.5 w-2.5 rounded-full ${statusStyle[status as keyof typeof statusStyle]}`} /><span className="flex-1 text-sm capitalize text-violet-700">{status}</span><span className="text-sm font-bold text-violet-900">{count}</span></div>)}</div></section><section className="rounded-2xl border border-violet-50 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-violet-900">Quick Actions</h2><div className="grid grid-cols-2 gap-2">{quickActions.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-xl bg-violet-50 p-3 text-center hover:bg-violet-100"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600"><Icon size={16} className="text-white" /></div><span className="text-xs font-semibold leading-tight text-violet-700">{label}</span></Link>)}</div></section></div></div>
  </div>;
}
