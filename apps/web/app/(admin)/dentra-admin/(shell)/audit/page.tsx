import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, ScrollText } from 'lucide-react';
import { getAdminAudit } from '@/lib/admin-audit';

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? '' : value ?? '';
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const actionLabel = (value: string) =>
  value.toLowerCase().replace(/[._]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const timestamp = (value: string) =>
  new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

function pageHref(filters: {
  actor: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
}) {
  const query = new URLSearchParams();
  if (filters.actor) query.set('actor', filters.actor);
  if (filters.action) query.set('action', filters.action);
  if (filters.dateFrom) query.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) query.set('dateTo', filters.dateTo);
  query.set('page', String(filters.page));
  return `/dentra-admin/audit?${query}`;
}

export default async function AuditPage({ searchParams }: Props) {
  const actor = one(searchParams?.actor).trim().slice(0, 100);
  const action = one(searchParams?.action).trim().slice(0, 100) || undefined;
  const rawFrom = one(searchParams?.dateFrom);
  const rawTo = one(searchParams?.dateTo);
  const dateFrom = validDate(rawFrom) ? rawFrom : undefined;
  const dateTo = validDate(rawTo) ? rawTo : undefined;
  const requestedPage = Number.parseInt(one(searchParams?.page), 10);
  const page = requestedPage > 0 ? requestedPage : 1;

  let result;
  try {
    result = await getAdminAudit({ actor, action, dateFrom, dateTo, page });
  } catch {
    return (
      <div className="p-6 sm:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h2 className="font-semibold">Unable to load the audit log</h2>
          <p className="mt-1 text-sm">Check that the API is running and refresh this page.</p>
        </div>
      </div>
    );
  }

  const { items, pagination } = result;
  const first = pagination.total
    ? (pagination.page - 1) * pagination.pageSize + 1
    : 0;
  const last = Math.min(pagination.page * pagination.pageSize, pagination.total);
  const hasFilters = Boolean(actor || action || dateFrom || dateTo);
  const filters = { actor, action, dateFrom, dateTo };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
              <ScrollText size={22} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
              <p className="text-sm text-slate-500">
                Immutable history of sensitive platform and clinic actions.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            <b className="text-slate-800">{pagination.total}</b> events
          </p>
        </div>

        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(190px,1fr)_220px_160px_160px_auto]">
          <label className="relative">
            <span className="sr-only">Filter by actor email</span>
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input name="actor" defaultValue={actor} maxLength={100} placeholder="Actor email" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-violet-400" />
          </label>
          <label>
            <span className="sr-only">Filter by action</span>
            <select name="action" defaultValue={action ?? ''} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">
              <option value="">All actions</option>
              {result.actionOptions.map((value) => <option key={value} value={value}>{actionLabel(value)}</option>)}
            </select>
          </label>
          <label><span className="sr-only">From date</span><input type="date" name="dateFrom" defaultValue={dateFrom} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" /></label>
          <label><span className="sr-only">To date</span><input type="date" name="dateTo" defaultValue={dateTo} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" /></label>
          <div className="flex gap-2"><button className="h-11 flex-1 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white">Apply</button>{hasFilters && <Link href="/dentra-admin/audit" className="flex h-11 items-center rounded-xl border border-slate-200 px-3 text-sm text-slate-600">Clear</Link>}</div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {items.length === 0 ? (
            <div className="flex min-h-64 items-center justify-center px-6 text-center text-sm text-slate-500">No audit events match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50"><tr>{['When', 'Actor', 'Action', 'Scope', 'Target'].map((label) => <th key={label} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-violet-50/40">
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{timestamp(item.occurredAt)}</td>
                      <td className="px-5 py-4"><p className="text-sm font-medium text-slate-800">{item.actorEmail ?? 'System'}</p>{item.ipAddress && <p className="text-xs text-slate-400">{item.ipAddress}</p>}</td>
                      <td className="whitespace-nowrap px-5 py-4"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{actionLabel(item.action)}</span></td>
                      <td className="px-5 py-4 text-sm text-slate-600">{item.clinicId ? <Link href={`/dentra-admin/clinics/${item.clinicId}`} className="font-medium text-violet-700 hover:underline">{item.clinicName ?? 'Clinic'}</Link> : 'Platform'}</td>
                      <td className="px-5 py-4"><p className="text-sm capitalize text-slate-700">{item.entityType.replaceAll('_', ' ')}</p><p className="max-w-48 truncate font-mono text-xs text-slate-400" title={item.entityId ?? undefined}>{item.entityId ?? '—'}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Showing {first}–{last} of {pagination.total}</p>
            <div className="flex items-center gap-2">
              {pagination.page > 1 && <Link href={pageHref({ ...filters, page: pagination.page - 1 })} className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm"><ChevronLeft size={15} />Previous</Link>}
              <span className="text-sm text-slate-500">Page {pagination.page} of {pagination.totalPages}</span>
              {pagination.page < pagination.totalPages && <Link href={pageHref({ ...filters, page: pagination.page + 1 })} className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm">Next<ChevronRight size={15} /></Link>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
