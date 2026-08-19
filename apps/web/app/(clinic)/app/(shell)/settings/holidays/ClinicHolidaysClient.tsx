'use client';
import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CalendarDays, CalendarOff, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Plus, Rows3, Trash2 } from 'lucide-react';
import type { ClinicClosure } from '@/lib/clinic-settings';

const input = 'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100';
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PAGE_SIZE = 10;

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildMonthGrid(year: number, month: number): Array<{ dateKey: string; day: number; inMonth: boolean }> {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ dateKey: string; day: number; inMonth: boolean }> = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push({ dateKey: toDateKey(prevYear, prevMonth, day), day, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) cells.push({ dateKey: toDateKey(year, month, day), day, inMonth: true });
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const last = cells[cells.length - 1];
    const [y, m, d] = last.dateKey.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    cells.push({ dateKey: toDateKey(next.getFullYear(), next.getMonth(), next.getDate()), day: next.getDate(), inMonth: false });
  }
  return cells;
}

export default function ClinicHolidaysClient({ clinicId, branches, closures }: { clinicId: string; branches: Array<{ id: string; name: string }>; closures: ClinicClosure[] }) {
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidePast, setHidePast] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedDate, setSelectedDate] = useState('');
  const today = new Date();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const [cursor, setCursor] = useState<{ year: number; month: number }>({ year: today.getFullYear(), month: today.getMonth() });

  async function request(path: string, method: string, body: object | null, key: string, successMessage = 'Changes saved successfully.') {
    setBusy(key); setError(null); setMessage(null);
    const response = await fetch(path, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => ({})) as { error?: { message?: string } } : {};
      setError(payload.error?.message ?? 'Unable to save the closure.'); setBusy(null); return false;
    }
    setBusy(null); setMessage(successMessage); router.refresh();
    setTimeout(() => setMessage((current) => (current === successMessage ? null : current)), 4000);
    return true;
  }
  async function addClosure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const branchId = String(data.get('branchId') ?? '') || null;
    const date = String(data.get('date') ?? '');
    const label = String(data.get('label') ?? '').trim();
    if (await request(`/api/clinic/${clinicId}/closures`, 'POST', { branchId, date, label }, 'add-closure', `"${label}" was added to your closures.`)) { form.reset(); setSelectedDate(''); }
  }
  async function toggleClosure(closure: ClinicClosure) {
    await request(`/api/clinic/${clinicId}/closures/${closure.id}`, 'PATCH', { isEnabled: !closure.isEnabled }, closure.id, closure.isEnabled ? `"${closure.label}" is now open (ignored).` : `"${closure.label}" is now marked closed.`);
  }
  async function removeClosure(closureId: string, label: string) {
    await request(`/api/clinic/${clinicId}/closures/${closureId}`, 'DELETE', null, closureId, `"${label}" was removed.`);
  }

  const visibleClosures = useMemo(
    () => (hidePast ? closures.filter((closure) => closure.date >= todayKey) : closures),
    [closures, hidePast, todayKey],
  );
  const pagedClosures = visibleClosures.slice(0, visibleCount);
  const closuresByDate = useMemo(() => {
    const map = new Map<string, ClinicClosure[]>();
    for (const closure of closures) map.set(closure.date, [...(map.get(closure.date) ?? []), closure]);
    return map;
  }, [closures]);
  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex items-center gap-3">
      <Link href="/app/settings" className="rounded-lg p-1.5 text-violet-400 transition-colors hover:bg-violet-100 hover:text-violet-600"><ChevronLeft size={18} /></Link>
      <div>
        <h1 className="text-xl font-bold text-violet-900">Holidays &amp; Closures</h1>
        <p className="text-sm text-violet-500">Philippine holidays are listed automatically — toggle any you stay open for, or add your own closure dates (typhoons, clinic events).</p>
      </div>
    </div>
    {message && <div role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={17} />{message}</div>}
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} />{error}</div>}

    <div className="flex rounded-xl border border-violet-200 bg-white p-1 text-sm font-semibold">
      <button type="button" onClick={() => setView('list')} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg py-2 ${view === 'list' ? 'bg-violet-600 text-white' : 'text-violet-600'}`}><Rows3 size={15} />List</button>
      <button type="button" onClick={() => setView('calendar')} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg py-2 ${view === 'calendar' ? 'bg-violet-600 text-white' : 'text-violet-600'}`}><CalendarDays size={15} />Calendar</button>
    </div>

    <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><CalendarOff size={17} className="text-violet-600" /><h2 className="font-bold text-slate-900">{view === 'list' ? 'Configured closures' : monthLabel}</h2></div>
        {view === 'list' && <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={hidePast} onChange={(event) => { setHidePast(event.target.checked); setVisibleCount(PAGE_SIZE); }} className="h-3.5 w-3.5 rounded border-slate-300" />Hide past dates</label>}
      </div>

      {view === 'list'
        ? <div>
            <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
              {visibleClosures.length === 0 && <p className="p-4 text-sm text-slate-400">{closures.length === 0 ? 'No closures configured yet.' : 'No upcoming closures. Uncheck "Hide past dates" to see past entries.'}</p>}
              {pagedClosures.map((closure) => {
                const branchName = closure.branchId ? branches.find((b) => b.id === closure.branchId)?.name ?? 'One branch' : 'All branches';
                return <div key={closure.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div><p className="text-sm font-semibold text-slate-800">{closure.label}</p><p className="text-xs text-slate-500">{closure.date} · {branchName} · {closure.source === 'ph_holiday' ? 'PH holiday' : 'Custom'}</p></div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input type="checkbox" checked={closure.isEnabled} disabled={busy === closure.id} onChange={() => void toggleClosure(closure)} className="h-3.5 w-3.5 rounded border-slate-300" />
                      {closure.isEnabled ? 'Closed' : 'Open (ignored)'}
                    </label>
                    {closure.source === 'custom' && <button type="button" disabled={busy === closure.id} onClick={() => void removeClosure(closure.id, closure.label)} className="text-red-500 hover:text-red-700" aria-label={`Remove ${closure.label}`}><Trash2 size={15} /></button>}
                  </div>
                </div>;
              })}
            </div>
            {visibleClosures.length > visibleCount && <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-50">Load more ({visibleClosures.length - visibleCount} remaining)</button>}
          </div>
        : <div>
            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={() => setCursor((c) => { const m = c.month === 0 ? 11 : c.month - 1; return { year: c.month === 0 ? c.year - 1 : c.year, month: m }; })} className="rounded-lg p-1.5 text-violet-500 hover:bg-violet-50" aria-label="Previous month"><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => setCursor((c) => { const m = c.month === 11 ? 0 : c.month + 1; return { year: c.month === 11 ? c.year + 1 : c.year, month: m }; })} className="rounded-lg p-1.5 text-violet-500 hover:bg-violet-50" aria-label="Next month"><ChevronRight size={18} /></button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-400">{weekdayLabels.map((d) => <div key={d}>{d}</div>)}</div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {grid.map((cell) => {
                const dayClosures = closuresByDate.get(cell.dateKey) ?? [];
                const isSelected = cell.dateKey === selectedDate;
                return <button
                  type="button"
                  key={cell.dateKey}
                  onClick={() => setSelectedDate(cell.dateKey)}
                  className={`min-h-16 rounded-lg border p-1 text-left text-xs transition-colors hover:border-violet-300 hover:bg-violet-50 ${isSelected ? 'border-violet-400 ring-2 ring-violet-200' : cell.inMonth ? 'border-slate-100 bg-white' : 'border-slate-50 bg-slate-50 text-slate-300'}`}
                >
                  <span className={cell.inMonth ? 'text-slate-600' : 'text-slate-300'}>{cell.day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayClosures.map((closure) => <span key={closure.id} title={closure.label} className={`block truncate rounded px-1 py-0.5 text-[10px] font-semibold ${closure.isEnabled ? (closure.source === 'ph_holiday' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700') : 'bg-slate-100 text-slate-400 line-through'}`}>{closure.label}</span>)}
                  </div>
                </button>;
              })}
            </div>
          </div>}

      <form onSubmit={addClosure} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <label className="sm:col-span-1"><span className="text-xs font-semibold text-slate-600">Branch</span><select name="branchId" className={input}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label className="sm:col-span-1"><span className="text-xs font-semibold text-slate-600">Date</span><input type="date" name="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} required className={input} /></label>
        <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Label</span><input type="text" name="label" required maxLength={200} placeholder="e.g. Clinic anniversary" className={input} /></label>
        <div className="sm:col-span-4"><button type="submit" disabled={busy === 'add-closure'} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:bg-violet-300">{busy === 'add-closure' ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Add closure</button></div>
      </form>
    </section>
  </div>;
}
