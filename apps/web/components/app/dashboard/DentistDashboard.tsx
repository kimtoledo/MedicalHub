"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, Users, type LucideIcon } from "lucide-react";
import { useAppBranch } from "../AppBranchContext";
import AppointmentActions from "./AppointmentActions";
import {
  statusStyle,
  time,
  todayManila,
  type DashboardAppointment,
  type RecentPatient,
} from "./types";
export default function DentistDashboard({ userName }: { userName: string }) {
  const { clinicId, branchId, branchName } = useAppBranch();
  const [schedule, setSchedule] = useState<DashboardAppointment[]>([]);
  const [recent, setRecent] = useState<RecentPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    const query = new URLSearchParams({ clinicId, date: todayManila() });
    if (branchId) query.set("branchId", branchId);
    try {
      const [scheduleResponse, recentResponse] = await Promise.all([
        fetch(`/api/clinic/dentist/schedule?${query}`, { cache: "no-store" }),
        fetch(`/api/clinic/dentist/recent-patients?${query}`, {
          cache: "no-store",
        }),
      ]);
      const schedulePayload = (await scheduleResponse.json()) as {
        data?: DashboardAppointment[];
        error?: { message?: string };
      };
      const recentPayload = (await recentResponse.json()) as {
        data?: RecentPatient[];
        error?: { message?: string };
      };
      if (!scheduleResponse.ok || !schedulePayload.data)
        throw new Error(
          schedulePayload.error?.message ?? "Schedule unavailable",
        );
      if (!recentResponse.ok || !recentPayload.data)
        throw new Error(
          recentPayload.error?.message ?? "Recent patients unavailable",
        );
      setSchedule(schedulePayload.data);
      setRecent(recentPayload.data);
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
  if (loading && !schedule.length)
    return (
      <div className="space-y-4 p-6">
        <div className="h-24 animate-pulse rounded-2xl bg-violet-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  const now = Date.now();
  const next = schedule.find(
    (item) =>
      item.startsAt &&
      new Date(item.startsAt).getTime() >= now &&
      ["pending", "confirmed", "checked_in"].includes(item.status),
  );
  const completed = schedule.filter(
    (item) => item.status === "completed",
  ).length;
  const cards: Array<{ label: string; value: number; Icon: LucideIcon }> = [
    { label: "Total Today", value: schedule.length, Icon: CalendarCheck },
    { label: "Completed", value: completed, Icon: Clock },
    { label: "Remaining", value: schedule.length - completed, Icon: Users },
  ];
  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-violet-500">{branchName}</p>
        <h1 className="mt-1 text-3xl font-bold text-violet-950">
          Good day, {userName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your live schedule refreshes every minute.
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
      <div className="grid grid-cols-3 gap-3">
        {cards.map(({ label, value, Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"
          >
            <Icon className="text-violet-600" size={20} />
            <p className="mt-3 text-2xl font-bold text-violet-950">
              {value}
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {label}
            </p>
          </article>
        ))}
      </div>
      {next && (
        <section className="rounded-2xl bg-gradient-to-r from-violet-700 to-violet-600 p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-violet-200">
            Next up
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            {next.patientFirstName} {next.patientLastName}
          </h2>
          <p className="mt-1 text-violet-200">
            {next.serviceName ?? "Dental visit"} · {time(next.startsAt)} ·{" "}
            {next.branchName}
          </p>
        </section>
      )}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <h2 className="font-bold text-slate-900">Today&apos;s schedule</h2>
            <Link
              href="/app/dentist/schedule"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600"
            >
              Full view <ArrowRight size={13} />
            </Link>
          </div>
          {schedule.length ? (
            <div className="divide-y divide-slate-100">
              {schedule.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-3 p-4 text-sm sm:grid-cols-[70px_1fr_110px_190px] sm:items-center"
                >
                  <p className="font-bold text-violet-900">
                    {time(item.startsAt)}
                  </p>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.patientFirstName} {item.patientLastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.serviceName ?? "Dental visit"}
                    </p>
                  </div>
                  <span
                    className={`justify-self-start rounded-full px-2 py-1 text-xs font-bold capitalize ${statusStyle(item.status)}`}
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
            <p className="p-10 text-center text-sm text-slate-500">
              No appointments today.
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-violet-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <h2 className="font-bold text-slate-900">Recent patients</h2>
            <Link
              href="/app/dentist/patients"
              className="text-xs font-semibold text-violet-600"
            >
              All
            </Link>
          </div>
          <div className="divide-y">
            {recent.map((item) => (
              <Link
                key={item.patientId}
                href={`/app/dentist/patients/${item.patientId}`}
                className="block p-4 hover:bg-violet-50"
              >
                <p className="font-semibold text-slate-900">
                  {item.firstName} {item.lastName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.serviceName ?? "Dental visit"} ·{" "}
                  {new Intl.DateTimeFormat("en-PH", {
                    dateStyle: "medium",
                    timeZone: "Asia/Manila",
                  }).format(new Date(item.lastVisit))}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
