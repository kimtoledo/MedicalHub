"use client";
import Link from "next/link";
import { addDays, statusStyle, type DashboardAppointment } from "./types";

const START_HOUR = 7;
const END_HOUR = 20;
const PX_PER_MINUTE = 1.1;
const HEIGHT = (END_HOUR - START_HOUR) * 60 * PX_PER_MINUTE;

function minutesFromStart(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return (hour - START_HOUR) * 60 + minute;
}
function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function layoutDay(items: DashboardAppointment[]) {
  const sorted = [...items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const placed: Array<{ item: DashboardAppointment; col: number; cols: number }> = [];
  let cluster: typeof placed = [];
  const active: Array<{ col: number; end: number }> = [];
  const flush = () => {
    if (!cluster.length) return;
    const cols = Math.max(...cluster.map((entry) => entry.col)) + 1;
    cluster.forEach((entry) => { entry.cols = cols; });
    placed.push(...cluster);
    cluster = [];
  };
  for (const item of sorted) {
    const start = minutesFromStart(item.startsAt);
    const end = item.endsAt ? minutesFromStart(item.endsAt) : start + 30;
    for (let index = active.length - 1; index >= 0; index -= 1) if (active[index].end <= start) active.splice(index, 1);
    if (!active.length) flush();
    const used = new Set(active.map((entry) => entry.col));
    let col = 0;
    while (used.has(col)) col += 1;
    active.push({ col, end });
    cluster.push({ item, col, cols: 1 });
  }
  flush();
  return placed;
}

export default function WeekCalendar({ rows, weekStart, appointmentHref }: { rows: DashboardAppointment[]; weekStart: string; appointmentHref: (id: string) => string }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  const byDay = new Map<string, DashboardAppointment[]>();
  for (const row of rows) { const key = dayKey(row.startsAt); byDay.set(key, [...(byDay.get(key) ?? []), row]); }
  return (
    <div className="overflow-x-auto rounded-2xl border border-violet-100 bg-white shadow-sm">
      <div className="grid min-w-[900px] grid-cols-[56px_repeat(7,1fr)]">
        <div className="border-b border-violet-100" />
        {days.map((day) => (
          <div key={day} className="border-b border-l border-violet-100 py-2 text-center text-xs font-bold text-violet-900">
            {new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "short" }).format(new Date(`${day}T12:00:00+08:00`))}
            <span className="ml-1 font-normal text-slate-400">{new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric" }).format(new Date(`${day}T12:00:00+08:00`))}</span>
          </div>
        ))}
        <div style={{ height: HEIGHT }} className="relative">
          {hours.map((hour, index) => (
            <p key={hour} style={{ top: index * 60 * PX_PER_MINUTE }} className="absolute right-1.5 -translate-y-1/2 text-[11px] text-slate-400">
              {hour % 12 === 0 ? 12 : hour % 12}{hour < 12 ? "am" : "pm"}
            </p>
          ))}
        </div>
        {days.map((day) => {
          const placed = layoutDay(byDay.get(day) ?? []);
          return (
            <div key={day} style={{ height: HEIGHT }} className="relative border-l border-violet-100">
              {hours.map((hour, index) => (
                <div key={hour} style={{ top: index * 60 * PX_PER_MINUTE }} className="absolute h-px w-full bg-violet-50" />
              ))}
              {placed.map(({ item, col, cols }) => {
                const start = minutesFromStart(item.startsAt);
                const end = item.endsAt ? minutesFromStart(item.endsAt) : start + 30;
                return (
                  <Link
                    key={item.id}
                    href={appointmentHref(item.id)}
                    style={{ top: start * PX_PER_MINUTE, height: Math.max((end - start) * PX_PER_MINUTE - 2, 22), left: `${(col / cols) * 100}%`, width: `calc(${100 / cols}% - 2px)` }}
                    className={`absolute overflow-hidden rounded-lg border-l-4 border-current p-1 text-[11px] font-semibold leading-tight shadow-sm hover:brightness-95 ${statusStyle(item.status)}`}
                  >
                    <p className="truncate">{item.patientLastName}, {item.patientFirstName}</p>
                    <p className="truncate font-normal opacity-80">{item.serviceName ?? "Dental visit"}</p>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
