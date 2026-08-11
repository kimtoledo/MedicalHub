"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Users,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { useAppBranch } from "../AppBranchContext";
import AppointmentActions from "./AppointmentActions";
import { statusStyle, time, todayManila, type DashboardSummary } from "./types";
export default function ClinicDashboard() {
  const { clinicId, branchId, branchName } = useAppBranch();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setError("");
    try {
      const query = new URLSearchParams({ clinicId, date: todayManila() });
      if (branchId) query.set("branchId", branchId);
      const response = await fetch(`/api/clinic/dashboard/summary?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: DashboardSummary;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.error?.message ?? "Dashboard unavailable");
      setData(payload.data);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Dashboard unavailable",
      );
    } finally {
      setLoading(false);
    }
  }, [clinicId, branchId]);
  useEffect(() => {
    setLoading(true);
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load]);
  if (loading && !data)
    return (
      <div className="space-y-4 p-6">
        <div className="h-20 animate-pulse rounded-2xl bg-violet-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  const kpis = [
    ["Today", data?.todayAppointmentCount ?? 0, CalendarDays],
    ["Checked In", data?.checkedInCount ?? 0, UserCheck],
    ["Upcoming", data?.upcomingCount ?? 0, Clock],
    ["Active Patients", data?.activePatientCount ?? 0, Users],
  ] as const;
  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-violet-500">{branchName}</p>
        <h1 className="mt-1 text-3xl font-bold text-violet-950">
          Clinic dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live operations for{" "}
          {new Date().toLocaleDateString("en-PH", { dateStyle: "full" })}
        </p>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <button
            onClick={() => void load()}
            className="ml-3 font-bold underline"
          >
            Retry
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([label, value, Icon]) => (
          <article
            key={label}
            className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"
          >
            <Icon className="text-violet-600" size={20} />
            <p className="mt-3 text-3xl font-bold text-violet-950">{value}</p>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
          </article>
        ))}
      </div>
      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-bold text-slate-900">
            Today&apos;s appointments
          </h2>
          <Link
            href="/app/appointments"
            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600"
          >
            Full list <ArrowRight size={13} />
          </Link>
        </div>
        {data?.appointments.length ? (
          <div className="divide-y divide-slate-100">
            {data.appointments.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 p-4 text-sm lg:grid-cols-[80px_1.3fr_1fr_1fr_120px_220px] lg:items-center"
              >
                <p className="font-bold text-violet-900">
                  {time(item.startsAt)}
                </p>
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.patientLastName}, {item.patientFirstName}
                  </p>
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
              </article>
            ))}
          </div>
        ) : (
          <p className="p-12 text-center text-sm text-slate-500">
            No appointments scheduled for this branch today.
          </p>
        )}
      </section>
    </div>
  );
}
