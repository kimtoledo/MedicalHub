'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertCircle, Eye, Loader2, MailSearch, RefreshCw, X } from 'lucide-react';

type EmailStatus = 'held' | 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled';
type EmailRow = { id: string; clinicName: string | null; source: 'platform' | 'clinic'; type: string; recipient: string; subject: string; status: EmailStatus; attempts: number; lastError: string | null; sentAt: string | null; createdAt: string };
type EmailDetail = EmailRow & { body: string; dedupeKey: string; updatedAt: string; nextAttemptAt: string };
type Result = { items: EmailRow[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };

const statuses: Array<{ value: '' | EmailStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'held', label: 'Held preview' },
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Processing' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const types = [
  ['', 'All email types'],
  ['dentist_verification_approved', 'Dentist verification approved'],
  ['dentist_verification_rejected', 'Dentist verification rejected'],
  ['dentist_verification_revoked', 'Dentist verification revoked'],
  ['booking_confirmation', 'Booking confirmation'],
  ['appointment_reminder', 'Appointment reminder'],
  ['appointment_cancelled', 'Appointment cancelled'],
  ['appointment_rescheduled', 'Appointment rescheduled'],
  ['recall_reminder', 'Recall reminder'],
  ['prescription_share', 'Prescription share'],
] as const;
const statusTone: Record<EmailStatus, string> = { held: 'bg-violet-50 text-violet-700', queued: 'bg-blue-50 text-blue-700', processing: 'bg-blue-50 text-blue-700', sent: 'bg-emerald-50 text-emerald-700', failed: 'bg-red-50 text-red-700', cancelled: 'bg-slate-100 text-slate-600' };
const label = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value: string | null) => value ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(value)) : '—';

export default function EmailLogsClient() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const query = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search) query.set('search', search);
    if (status) query.set('status', status);
    if (type) query.set('type', type);
    if (dateFrom) query.set('dateFrom', dateFrom);
    if (dateTo) query.set('dateTo', dateTo);
    try {
      const response = await fetch(`/api/admin/email-logs?${query}`, { cache: 'no-store' });
      const body = await response.json() as { success: boolean; data?: Result; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? 'Unable to load email logs');
      setResult(body.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load email logs'); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo, page, search, status, type]);

  useEffect(() => { void load(); }, [load]);

  function applyFilters(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(draftSearch.trim()); }

  async function openDetail(id: string) {
    setDetailLoading(true); setError(null);
    try {
      const response = await fetch(`/api/admin/email-logs/${id}`, { cache: 'no-store' });
      const body = await response.json() as { success: boolean; data?: EmailDetail; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? 'Unable to load email content');
      setDetail(body.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load email content'); }
    finally { setDetailLoading(false); }
  }

  return <main className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-2xl bg-violet-100 p-3"><MailSearch className="text-violet-600" /></div><div><h1 className="text-2xl font-bold text-slate-900">Email Logs</h1><p className="text-sm text-slate-500">Inspect the exact Dentra.ph email snapshot and delivery state.</p></div></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button></header>
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800"><strong>Held preview</strong> means the final subject and body were saved for review but were not sent to an external provider.</div>
    <form onSubmit={applyFilters} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6">
      <input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Recipient, subject, or clinic" className="h-10 rounded-xl border border-slate-300 px-3 text-sm md:col-span-2" />
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-300 px-3 text-sm">{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-300 px-3 text-sm">{types.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
      <input type="date" aria-label="From date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" />
      <div className="flex gap-2"><input type="date" aria-label="To date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm" /><button className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white">Search</button></div>
    </form>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={17} />{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <div className="flex items-center justify-center gap-2 p-12 text-violet-600"><Loader2 className="animate-spin" />Loading email logs…</div> : result?.items.length ? <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Created</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Message</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Preview</span></th></tr></thead><tbody className="divide-y divide-slate-100">{result.items.map((item) => <tr key={item.id} className="hover:bg-violet-50/40"><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{date(item.createdAt)}</td><td className="px-4 py-4 text-sm font-medium text-slate-800">{item.recipient}</td><td className="max-w-md px-4 py-4"><p className="truncate text-sm font-semibold text-slate-900">{item.subject}</p><p className="text-xs text-slate-500">{label(item.type)}</p></td><td className="px-4 py-4 text-xs text-slate-600">{item.clinicName ?? 'Dentra.ph platform'}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone[item.status]}`}>{item.status}</span></td><td className="px-4 py-4"><button type="button" onClick={() => void openDetail(item.id)} disabled={detailLoading} aria-label={`Preview ${item.subject}`} className="rounded-lg p-2 text-violet-600 hover:bg-violet-100"><Eye size={16} /></button></td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-sm text-slate-500">No email logs match these filters.</div>}
      {result && result.pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm text-slate-600"><span>{result.pagination.total} messages</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><span>Page {page} of {result.pagination.totalPages}</span><button type="button" disabled={page >= result.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>}
    </section>
  </div>
  {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setDetail(null)}><section role="dialog" aria-modal="true" aria-labelledby="email-preview-title" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><header className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{label(detail.type)}</p><h2 id="email-preview-title" className="mt-1 text-xl font-bold text-slate-900">Email preview</h2></div><button type="button" onClick={() => setDetail(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></header><div className="space-y-5 p-5"><dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold text-slate-500">To</dt><dd className="mt-1 text-slate-900">{detail.recipient}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Status</dt><dd className="mt-1 capitalize text-slate-900">{detail.status} · {detail.attempts} attempts</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">Subject</dt><dd className="mt-1 font-semibold text-slate-900">{detail.subject}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Created</dt><dd className="mt-1 text-slate-900">{date(detail.createdAt)}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Sent</dt><dd className="mt-1 text-slate-900">{date(detail.sentAt)}</dd></div>{detail.lastError && <div className="sm:col-span-2"><dt className="text-xs font-semibold text-red-600">Last error</dt><dd className="mt-1 text-red-700">{detail.lastError}</dd></div>}</dl><div><h3 className="text-sm font-bold text-slate-900">Exact saved content</h3><pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-5 font-sans text-sm leading-6 text-slate-700">{detail.body}</pre></div></div></section></div>}
  </main>;
}
