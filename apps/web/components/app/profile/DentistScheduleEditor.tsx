"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarClock, Loader2, Plane, Plus, Save, Trash2 } from "lucide-react";

type ScheduleRow = { weekday: number; startsAt: number; endsAt: number };
type TimeOff = { id: string; startDate: string; endDate: string; reason: string | null };
const weekdays = [{ weekday: 1, label: "Monday" }, { weekday: 2, label: "Tuesday" }, { weekday: 3, label: "Wednesday" }, { weekday: 4, label: "Thursday" }, { weekday: 5, label: "Friday" }, { weekday: 6, label: "Saturday" }, { weekday: 0, label: "Sunday" }] as const;
const minutesToTime = (value: number): string => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const timeToMinutes = (value: string): number | null => { const match = /^(\d{2}):(\d{2})$/.exec(value); return match ? Number(match[1]) * 60 + Number(match[2]) : null; };

export default function DentistScheduleEditor({ affiliations }: { affiliations: Array<{ branchId: string; clinicName: string; branchName: string }> }) {
  const [branchId, setBranchId] = useState(affiliations[0]?.branchId ?? "");
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [enabled, setEnabled] = useState<Record<number, boolean>>({});
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSchedule(forBranchId: string) {
    if (!forBranchId) return;
    setLoading(true); setError(null);
    const response = await fetch(`/api/dentist/schedule?branchId=${forBranchId}`, { cache: "no-store" }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { data?: ScheduleRow[]; error?: { message?: string } } : {};
    if (!response?.ok || !payload.data) { setError(payload.error?.message ?? "Unable to load working hours"); setLoading(false); return; }
    setRows(payload.data); setEnabled(Object.fromEntries(payload.data.map((row) => [row.weekday, true]))); setLoading(false);
  }
  async function loadTimeOff() {
    const response = await fetch("/api/dentist/time-off", { cache: "no-store" }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { data?: TimeOff[] } : {};
    if (response?.ok && payload.data) setTimeOff(payload.data);
  }
  useEffect(() => { void loadSchedule(branchId); }, [branchId]);
  useEffect(() => { void loadTimeOff(); }, []);

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextRows: ScheduleRow[] = [];
    for (const { weekday } of weekdays) {
      if (!enabled[weekday]) continue;
      const startsAt = timeToMinutes(String(data.get(`starts-${weekday}`) ?? ""));
      const endsAt = timeToMinutes(String(data.get(`ends-${weekday}`) ?? ""));
      if (startsAt == null || endsAt == null || startsAt >= endsAt) { setError(`Check the start/end time for ${weekdays.find((d) => d.weekday === weekday)?.label}`); return; }
      nextRows.push({ weekday, startsAt, endsAt });
    }
    setBusy("schedule"); setError(null); setMessage(null);
    const response = await fetch(`/api/dentist/schedule?branchId=${branchId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: nextRows }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { data?: ScheduleRow[]; error?: { message?: string } } : {};
    if (!response?.ok || !payload.data) setError(payload.error?.message ?? "Unable to save working hours");
    else { setRows(payload.data); setMessage(nextRows.length ? "Working hours saved." : "Reverted to the branch's default hours."); }
    setBusy(null);
  }

  async function addTimeOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const startDate = String(data.get("startDate") ?? ""); const endDate = String(data.get("endDate") ?? ""); const reason = String(data.get("reason") ?? "").trim() || null;
    setBusy("add-time-off"); setError(null); setMessage(null);
    const response = await fetch("/api/dentist/time-off", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ startDate, endDate, reason }) }).catch(() => null);
    if (!response?.ok) { const payload = await response?.json().catch(() => ({})) as { error?: { message?: string } } ?? {}; setError(payload.error?.message ?? "Unable to add time off"); setBusy(null); return; }
    event.currentTarget.reset(); await loadTimeOff(); setMessage("Time off added."); setBusy(null);
  }
  async function removeTimeOff(id: string) {
    setBusy(id); setError(null);
    const response = await fetch(`/api/dentist/time-off/${id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) { setError("Unable to remove time off"); setBusy(null); return; }
    await loadTimeOff(); setBusy(null);
  }

  if (!affiliations.length) return null;
  const row = (weekday: number) => rows.find((r) => r.weekday === weekday);

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-2"><CalendarClock size={17} className="text-violet-600" /><h2 className="font-bold text-slate-900">Working hours &amp; time off</h2></div>
    <p className="mt-1 text-sm text-slate-500">Leave a day unchecked, or leave every day unchecked and save, to follow the branch&apos;s default hours instead of your own.</p>
    {message && <div role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
    {error && <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {affiliations.length > 1 && <label className="mt-4 block text-xs font-semibold text-slate-600">Branch<select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1.5 h-10 w-full max-w-xs rounded-xl border border-slate-200 px-3 text-sm">{affiliations.map((a) => <option key={a.branchId} value={a.branchId}>{a.clinicName} · {a.branchName}</option>)}</select></label>}
    {loading ? <div className="mt-4 h-32 animate-pulse rounded-xl bg-slate-100" /> : <form onSubmit={saveSchedule} className="mt-4 space-y-2">
      {weekdays.map(({ weekday, label }) => { const existing = row(weekday); return <div key={weekday} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-2.5"><span className="w-24 text-xs font-semibold text-slate-600">{label}</span><label className="flex items-center gap-1.5 text-xs text-slate-500"><input type="checkbox" checked={enabled[weekday] ?? false} onChange={(event) => setEnabled({ ...enabled, [weekday]: event.target.checked })} className="h-3.5 w-3.5 rounded border-slate-300" />Working</label><input type="time" name={`starts-${weekday}`} defaultValue={minutesToTime(existing?.startsAt ?? 540)} disabled={!enabled[weekday]} className="h-9 rounded-lg border border-slate-200 px-2 text-xs disabled:bg-slate-50 disabled:text-slate-300" /><span className="text-xs text-slate-400">to</span><input type="time" name={`ends-${weekday}`} defaultValue={minutesToTime(existing?.endsAt ?? 1020)} disabled={!enabled[weekday]} className="h-9 rounded-lg border border-slate-200 px-2 text-xs disabled:bg-slate-50 disabled:text-slate-300" /></div>; })}
      <button type="submit" disabled={busy === "schedule"} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:bg-violet-300">{busy === "schedule" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save working hours</button>
    </form>}
    <div className="mt-6 border-t border-slate-100 pt-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Plane size={15} className="text-violet-600" />Time off</h3>
      <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">{timeOff.length === 0 && <p className="p-3 text-sm text-slate-400">No upcoming time off.</p>}{timeOff.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-2 p-3"><div><p className="text-sm font-semibold text-slate-800">{entry.startDate} – {entry.endDate}</p>{entry.reason && <p className="text-xs text-slate-500">{entry.reason}</p>}</div><button type="button" disabled={busy === entry.id} onClick={() => void removeTimeOff(entry.id)} className="text-red-500 hover:text-red-700" aria-label="Remove time off"><Trash2 size={15} /></button></div>)}</div>
      <form onSubmit={addTimeOff} className="mt-3 grid gap-3 sm:grid-cols-4"><label className="sm:col-span-1"><span className="text-xs font-semibold text-slate-600">Start</span><input type="date" name="startDate" required className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-2 text-sm" /></label><label className="sm:col-span-1"><span className="text-xs font-semibold text-slate-600">End</span><input type="date" name="endDate" required className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-2 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Reason (optional)</span><input type="text" name="reason" maxLength={500} placeholder="Vacation, seminar, sick leave..." className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-2 text-sm" /></label><div className="sm:col-span-4"><button type="submit" disabled={busy === "add-time-off"} className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200 px-4 text-sm font-semibold text-violet-700 disabled:opacity-50">{busy === "add-time-off" ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Add time off</button></div></form>
    </div>
  </section>;
}
