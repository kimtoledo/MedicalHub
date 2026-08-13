'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertCircle, Flag, Loader2, MessagesSquare } from 'lucide-react';

type Filter = 'pending' | 'reported' | 'approved' | 'rejected' | 'hidden' | 'all';
type Decision = 'approved' | 'rejected' | 'hidden';
type Report = { reviewId: string; reason: string; details: string | null; createdAt: string };
type Review = { id: string; clinicName: string; rating: number; comment: string; status: string; moderationReason: string | null; reportCount: number; reports: Report[]; createdAt: string };
const filters: Filter[] = ['pending', 'reported', 'approved', 'rejected', 'hidden', 'all'];

export default function ReviewsModerationClient() {
  const [filter, setFilter] = useState<Filter>('pending');
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<{ review: Review; decision: Decision } | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reviews?status=${filter}`, { cache: 'no-store' });
      const body = await response.json() as { success: boolean; data?: Review[]; error?: { message?: string } };
      if (!response.ok || !body.success) throw new Error(body.error?.message ?? 'Unable to load review queue');
      setItems(body.data ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load review queue');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  async function moderate(event: FormEvent) {
    event.preventDefault();
    if (!active) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reviews/${active.review.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: active.decision, reason }) });
      const body = await response.json() as { success: boolean; error?: { message?: string } };
      if (!response.ok || !body.success) throw new Error(body.error?.message ?? 'Unable to moderate review');
      setActive(null);
      setReason('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to moderate review');
    } finally {
      setSaving(false);
    }
  }

  function choose(review: Review, decision: Decision) {
    setActive({ review, decision });
    setReason('');
  }

  return <main className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-6xl space-y-5">
    <header className="flex items-center gap-3"><div className="rounded-2xl bg-violet-100 p-3"><MessagesSquare className="text-violet-600" /></div><div><h1 className="text-2xl font-bold text-slate-900">Patient review moderation</h1><p className="text-sm text-slate-500">Publish eligible feedback and investigate reported content without exposing patient identity.</p></div></header>
    <div className="flex gap-2 overflow-x-auto pb-1">{filters.map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${filter === value ? 'bg-violet-600 text-white' : 'border border-violet-200 bg-white text-violet-700'}`}>{value}</button>)}</div>
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"><span className="flex items-center gap-2"><AlertCircle size={17} />{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}
    {loading ? <div className="flex items-center gap-2 rounded-2xl bg-white p-8 text-violet-600"><Loader2 className="animate-spin" /> Loading reviews…</div> : items.length ? <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-violet-100 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-violet-950">{item.clinicName}</p><p className="text-xs text-slate-500">Submitted {new Date(item.createdAt).toLocaleDateString('en-PH')}</p></div><div className="flex items-center gap-2"><span className="text-sm text-amber-500" aria-label={`${item.rating} out of 5 stars`}>{'★'.repeat(item.rating)}<span className="text-slate-200">{'★'.repeat(5 - item.rating)}</span></span><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold capitalize text-violet-700">{item.status}</span></div></div><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{item.comment}</p>
      {item.reports.length > 0 && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3"><p className="flex items-center gap-1 text-xs font-bold uppercase text-red-700"><Flag size={13} /> {item.reportCount} pending report{item.reportCount === 1 ? '' : 's'}</p><div className="mt-2 space-y-2">{item.reports.map((report, index) => <div key={`${report.reviewId}-${index}`} className="text-xs text-red-800"><span className="font-semibold capitalize">{report.reason.replace('_', ' ')}</span>{report.details ? ` — ${report.details}` : ''}</div>)}</div></div>}
      {item.moderationReason && <p className="mt-3 text-xs text-slate-500">Last moderation reason: {item.moderationReason}</p>}
      <div className="mt-4 flex flex-wrap gap-2">{item.status === 'pending' && <><button onClick={() => choose(item, 'approved')} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700">Approve</button><button onClick={() => choose(item, 'rejected')} className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Reject</button></>}{item.status !== 'hidden' && item.status !== 'rejected' && <button onClick={() => choose(item, 'hidden')} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Hide</button>}</div>
    </article>)}</div> : <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-10 text-center text-sm text-slate-500">No {filter === 'all' ? '' : filter} reviews.</div>}
    {active && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setActive(null)}><form onSubmit={moderate} onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6"><h2 className="text-lg font-bold capitalize text-slate-900">{active.decision} review</h2><p className="mt-1 text-sm text-slate-500">The reason is retained in the moderation audit trail.</p><label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="moderation-reason">Reason</label><textarea id="moderation-reason" required minLength={3} maxLength={1000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-xl border border-violet-200 p-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" /><div className="mt-4 flex gap-2"><button type="button" onClick={() => setActive(null)} className="flex-1 rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Confirm'}</button></div></form></div>}
  </div></main>;
}
