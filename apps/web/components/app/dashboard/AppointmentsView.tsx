"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight, Rows3, Search } from "lucide-react";
import { useAppBranch } from "../AppBranchContext";
import AppointmentActions from "./AppointmentActions";
import WeekCalendar from "./WeekCalendar";
import {
  addDays,
  mondayOf,
  statusStyle,
  time,
  todayManila,
  weekRangeLabel,
  type DashboardAppointment,
} from "./types";
import { appointmentDetailHref, patientProfileHref } from "@/lib/dentist-schedule-navigation";
import NewAppointmentDrawer from "../appointments/NewAppointmentDrawer";
export default function AppointmentsView({ dentist = false }: { dentist?: boolean }) {
  const { clinicId, branchId, branchName } = useAppBranch();
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const [date, setDate] = useState(todayManila());
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [dentistId, setDentistId] = useState("");
  const [options, setOptions] = useState<{ services: Array<{ id: string; name: string }>; dentists: Array<{ id: string; firstName: string; lastName: string }> }>({ services: [], dentists: [] });
  const [rows, setRows] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const weekStart = mondayOf(date);
  const load = useCallback(async () => {
    setError("");
    try {
      const query = new URLSearchParams({ clinicId, date: mode === "calendar" ? weekStart : date });
      if (mode === "calendar") query.set("endDate", addDays(weekStart, 6));
      if (branchId) query.set("branchId", branchId);
      if (status) query.set("status", status);
      if (search.trim()) query.set("search", search.trim());
      if (serviceId) query.set("serviceId", serviceId);
      if (dentistId && !dentist) query.set("dentistId", dentistId);
      const response = await fetch(`${dentist ? "/api/clinic/dentist/schedule" : "/api/clinic/appointments"}?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: DashboardAppointment[];
        error?: { message?: string };
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.error?.message ?? "Appointments unavailable");
      setRows(payload.data);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Appointments unavailable",
      );
    } finally {
      setLoading(false);
    }
  }, [clinicId, branchId, date, status, search, serviceId, dentistId, dentist, mode, weekStart]);
  useEffect(() => { const query = new URLSearchParams({ clinicId }); if (branchId) query.set("branchId", branchId); fetch(`/api/clinic/appointment-options?${query}`, { cache: "no-store" }).then((response) => response.json()).then((payload) => { if (payload.data) setOptions(payload.data); }).catch(() => undefined); }, [clinicId, branchId]);
  useEffect(() => {
    setLoading(true);
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load]);
  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-violet-500">{branchName}</p>
          <h1 className="mt-1 text-3xl font-bold text-violet-950">
            Appointments
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {!dentist && <NewAppointmentDrawer clinicId={clinicId} branchId={branchId} onCreated={() => void load()} />}
        <div className="flex rounded-xl border border-violet-200 bg-white p-1 text-sm font-semibold">
          <button
            onClick={() => setMode("list")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${mode === "list" ? "bg-violet-600 text-white" : "text-violet-700"}`}
          >
            <Rows3 size={15} />List
          </button>
          <button
            onClick={() => setMode("calendar")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${mode === "calendar" ? "bg-violet-600 text-white" : "text-violet-700"}`}
          >
            <CalendarRange size={15} />Calendar
          </button>
        </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1 sm:max-w-sm"><span className="sr-only">Search appointments</span><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient or patient number" className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm" /></label>
        {mode === "list" ? (
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <button onClick={() => setDate(addDays(date, -7))} className="rounded-lg p-1 text-violet-700 hover:bg-violet-50" aria-label="Previous week">
              <ChevronLeft size={16} />
            </button>
            <p className="min-w-[170px] text-center font-semibold text-violet-950">{weekRangeLabel(weekStart)}</p>
            <button onClick={() => setDate(addDays(date, 7))} className="rounded-lg p-1 text-violet-700 hover:bg-violet-50" aria-label="Next week">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setDate(todayManila())} className="ml-1 rounded-lg border border-violet-200 px-2 py-1 text-xs font-bold text-violet-700 hover:bg-violet-50">
              Today
            </button>
          </div>
        )}
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {[
            "pending",
            "confirmed",
            "checked_in",
            "in_progress",
            "completed",
            "cancelled",
            "no_show",
          ].map((item) => (
            <option key={item} value={item}>
              {item.replace("_", " ")}
            </option>
          ))}
        </select>
        <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="">All services</option>{options.services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {!dentist && <select value={dentistId} onChange={(event) => setDentistId(event.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="">All dentists</option>{options.dentists.map((item) => <option key={item.id} value={item.id}>Dr. {item.firstName} {item.lastName}</option>)}</select>}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {mode === "calendar" ? (
        loading && !rows.length ? (
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-violet-50" />
        ) : (
          <div className="mt-6">
            <WeekCalendar rows={rows} weekStart={weekStart} appointmentHref={(id) => appointmentDetailHref(id, dentist)} />
          </div>
        )
      ) : (
        <section className="mt-6 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
          {loading && !rows.length ? (
            <div className="h-64 animate-pulse bg-violet-50" />
          ) : rows.length ? (
            <div className="divide-y">
              {rows.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-3 p-4 text-sm lg:grid-cols-[80px_1.2fr_1fr_1fr_110px_220px_140px] lg:items-center"
                >
                  <p className="font-bold text-violet-900">
                    {time(item.startsAt)}
                  </p>
                  <div>
                    {patientProfileHref(item.patientId, dentist) ? <Link href={patientProfileHref(item.patientId, dentist)!} className="rounded font-semibold text-violet-700 hover:text-violet-900 hover:underline focus:outline-none focus:ring-2 focus:ring-violet-500">{item.patientLastName}, {item.patientFirstName}</Link> : <p className="font-semibold text-slate-900">{item.patientLastName}, {item.patientFirstName}</p>}
                    <p className="text-xs text-slate-500">
                      {item.patientNumber ?? "Public booking"}
                    </p>
                  </div>
                  <p className="text-slate-600">
                    {item.serviceName ?? "Dental visit"}
                  </p>
                  <p className="text-slate-600">
                    {item.dentistFirstName
                      ? `Dr. ${item.dentistFirstName} ${item.dentistLastName}`
                      : "Unassigned"}
                  </p>
                  <span
                    className={`justify-self-start rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyle(item.status)}`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                  <AppointmentActions
                    clinicId={clinicId}
                    appointmentId={item.id}
                    status={item.status}
                    onUpdated={() => void load()}
                  />
                  <Link
                    href={appointmentDetailHref(item.id, dentist)}
                    className="justify-self-start rounded text-xs font-bold text-violet-600 hover:text-violet-900 hover:underline focus:outline-none focus:ring-2 focus:ring-violet-500 lg:justify-self-end"
                  >
                    View details
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="p-16 text-center text-sm text-slate-500">
              No appointments match this date and status.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
