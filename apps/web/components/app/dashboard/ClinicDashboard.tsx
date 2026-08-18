"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Ban,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Receipt,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import { useAppBranch } from "../AppBranchContext";
import NewAppointmentDrawer from "../appointments/NewAppointmentDrawer";
import WalkInDrawer from "../appointments/WalkInDrawer";
import NewPatientDrawer from "../patients/NewPatientDrawer";
import AppointmentActions from "./AppointmentActions";
import PatientQuickSearch from "./PatientQuickSearch";
import { statusStyle, time, todayManila, type DashboardSummary } from "./types";
import {
  groupTodayAppointments,
  todayAppointmentLinkLabel,
  type TodayQueueKey,
} from "@/lib/lean-clinic-today";

const queueSections: Array<{
  key: TodayQueueKey;
  label: string;
  description: string;
  empty: string;
  icon: typeof Clock;
  tone: string;
}> = [
  {
    key: "waiting",
    label: "Waiting now",
    description: "Checked in and ready for the next step",
    empty: "No patients waiting.",
    icon: UserCheck,
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "inTreatment",
    label: "In treatment",
    description: "Visits currently being handled",
    empty: "No visits in progress.",
    icon: Stethoscope,
    tone: "bg-blue-100 text-blue-700",
  },
  {
    key: "upcoming",
    label: "Upcoming",
    description: "Pending and confirmed appointments",
    empty: "No upcoming appointments today.",
    icon: CalendarClock,
    tone: "bg-violet-100 text-violet-700",
  },
  {
    key: "completed",
    label: "Completed",
    description: "Ready for review, billing, or follow-up",
    empty: "No completed visits yet.",
    icon: CheckCircle2,
    tone: "bg-slate-100 text-slate-700",
  },
  {
    key: "closed",
    label: "Closed",
    description: "Cancelled and no-show appointments",
    empty: "",
    icon: Ban,
    tone: "bg-red-100 text-red-700",
  },
];

export default function ClinicDashboard() {
  const { clinicId, branchId, branchName } = useAppBranch();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [earnings, setEarnings] = useState<{
    totalPhp: string;
    invoiceCount: number;
  } | null>(null);
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
        throw new Error(payload.error?.message ?? "Today workspace unavailable");
      setData(payload.data);

      const earningsResponse = await fetch(
        `/api/clinic/${clinicId}/earnings/today`,
        { cache: "no-store" },
      );
      if (earningsResponse.ok) {
        const earningsPayload = (await earningsResponse.json()) as {
          success: boolean;
          data?: { totalPhp: string; invoiceCount: number };
        };
        setEarnings(earningsPayload.success ? earningsPayload.data ?? null : null);
      } else {
        setEarnings(null);
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Today workspace unavailable",
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
      <div className="space-y-4 p-4 sm:p-8">
        <div className="h-40 animate-pulse rounded-2xl bg-violet-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-white" />
      </div>
    );

  const grouped = groupTodayAppointments(data?.appointments ?? []);
  const kpis = [
    ["Today", data?.todayAppointmentCount ?? 0, CalendarDays],
    ["Waiting", data?.checkedInCount ?? 0, UserCheck],
    ["Upcoming", data?.upcomingCount ?? 0, Clock],
    ["Active Patients", data?.activePatientCount ?? 0, Users],
    [
      "Today's Collections",
      earnings
        ? `₱${Number(earnings.totalPhp).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : "₱0.00",
      Banknote,
    ],
  ] as const;

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <header>
        <p className="text-sm font-semibold text-violet-500">{branchName}</p>
        <h1 className="mt-1 text-3xl font-bold text-violet-950">Today</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your daily clinic desk for{" "}
          {new Date().toLocaleDateString("en-PH", { dateStyle: "full" })}
        </p>
      </header>

      {error ? (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={() => void load()} className="ml-3 font-bold underline">
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-violet-950">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Start the clinic&apos;s most common tasks without leaving Today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <WalkInDrawer
              clinicId={clinicId}
              branchId={branchId}
              onCreated={() => void load()}
            />
            <NewPatientDrawer
              clinicId={clinicId}
              variant="modal"
              basePath="/app/patients"
            />
            <NewAppointmentDrawer
              clinicId={clinicId}
              branchId={branchId}
              onCreated={() => void load()}
            />
            <Link
              href="/app/billing"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-bold text-violet-700 hover:bg-violet-100"
            >
              <Receipt size={17} /> Billing
            </Link>
          </div>
        </div>
        <div className="mt-4">
          <PatientQuickSearch clinicId={clinicId} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map(([label, value, Icon]) => (
          <article
            key={label}
            className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"
          >
            <Icon className="text-violet-600" size={20} />
            <p className="mt-3 text-2xl font-bold text-violet-950 sm:text-3xl">
              {value}
            </p>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            {label === "Today's Collections" && earnings ? (
              <p className="mt-1 text-xs text-slate-400">
                {earnings.invoiceCount} paid invoice
                {earnings.invoiceCount === 1 ? "" : "s"}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-violet-950">Today&apos;s flow</h2>
          <p className="text-sm text-slate-500">Work from the queue that needs attention now.</p>
        </div>
        <Link
          href="/app/appointments"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-violet-700 hover:underline"
        >
          Full schedule <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {queueSections.map((section) => {
          const rows = grouped[section.key];
          if (section.key === "closed" && !rows.length) return null;
          const Icon = section.icon;
          return (
            <section
              key={section.key}
              className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${section.tone}`}>
                  <Icon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900">{section.label}</h3>
                  <p className="truncate text-xs text-slate-500">{section.description}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {rows.length}
                </span>
              </div>

              {rows.length ? (
                <div className="divide-y divide-slate-100">
                  {rows.map((item) => (
                    <article key={item.id} className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <p className="w-16 shrink-0 pt-0.5 text-sm font-bold text-violet-900">
                            {time(item.startsAt)}
                          </p>
                          <div className="min-w-0">
                            {item.patientId ? (
                              <Link
                                href={`/app/patients/${item.patientId}`}
                                className="block truncate text-sm font-bold text-slate-900 hover:text-violet-700 hover:underline"
                              >
                                {item.patientLastName}, {item.patientFirstName}
                              </Link>
                            ) : (
                              <p className="truncate text-sm font-bold text-slate-900">
                                {item.patientLastName}, {item.patientFirstName}
                              </p>
                            )}
                            <p className="truncate text-xs text-slate-500">
                              {item.serviceName ?? "Dental visit"}
                              {item.dentistFirstName
                                ? ` · Dr. ${item.dentistFirstName} ${item.dentistLastName}`
                                : " · Unassigned"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`self-start rounded-full px-2.5 py-1 text-xs font-bold capitalize sm:self-auto ${statusStyle(item.status)}`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        {["pending", "confirmed", "checked_in"].includes(item.status) ? (
                          <AppointmentActions
                            clinicId={clinicId}
                            appointmentId={item.id}
                            status={item.status}
                            primaryOnly
                            skipRoutineConfirmation
                            onUpdated={() => void load()}
                          />
                        ) : null}
                        <Link
                          href={`/app/appointments/${item.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50"
                        >
                          {todayAppointmentLinkLabel(item.status)} <ArrowRight size={13} />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="p-8 text-center text-sm text-slate-500">{section.empty}</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
