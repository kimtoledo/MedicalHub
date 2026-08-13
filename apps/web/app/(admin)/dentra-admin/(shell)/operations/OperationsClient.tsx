'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldAlert, DatabaseBackup, Building2, AlertCircle, Loader2,
  Check, X, Clock3,
} from 'lucide-react';

type SupportAccessRequest = {
  id: string;
  clinicId: string;
  clinicName: string;
  requestedByEmail: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'used';
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type TenantExportRequest = {
  id: string;
  clinicId: string;
  clinicName: string;
  requestedByEmail: string;
  status: 'requested' | 'processing' | 'ready' | 'failed' | 'cancelled';
  requestedAt: string;
  completedAt: string | null;
  retentionUntil: string | null;
  failureReason: string | null;
  createdAt: string;
};

type ClinicSummary = { id: string; name: string; status: string; createdAt: string };

const SUPPORT_STATUS_STYLES: Record<SupportAccessRequest['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  denied: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
  used: 'bg-violet-100 text-violet-700',
};

const EXPORT_STATUS_STYLES: Record<TenantExportRequest['status'], string> = {
  requested: 'bg-amber-100 text-amber-700',
  processing: 'bg-violet-100 text-violet-700',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function formatManila(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
}

function SupportAccessSection() {
  const [requests, setRequests] = useState<SupportAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/operations/support-access', { cache: 'no-store' });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) { setError(payload.error?.message ?? 'Unable to load support-access requests.'); return; }
    setError(null);
    setRequests(payload.data);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function review(id: string, status: 'approved' | 'denied') {
    setBusyId(id);
    const response = await fetch(`/api/admin/operations/support-access/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to review this request.'); return; }
    await load();
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><ShieldAlert size={15} /> Support-access requests</h2>
      <p className="mb-3 text-xs text-slate-500">Clinics submit these with a written justification before support looks at their records. Approval grants a 30-minute window; enforcement of that window at the data layer is still being built.</p>
      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-xs text-slate-400">No support-access requests.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((request) => (
            <li key={request.id} className="rounded-xl border border-violet-50 px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-violet-900">{request.clinicName}</p>
                  <p className="text-xs text-slate-500">Requested by {request.requestedByEmail} · {formatManila(request.createdAt)}</p>
                  <p className="mt-1 text-xs text-slate-600">{request.reason}</p>
                  {request.status === 'approved' && <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600"><Clock3 size={11} /> Approved window expires {formatManila(request.expiresAt)}</p>}
                  {request.reviewedByEmail && <p className="text-xs text-slate-400">Reviewed by {request.reviewedByEmail} · {formatManila(request.reviewedAt)}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${SUPPORT_STATUS_STYLES[request.status]}`}>{request.status}</span>
                  {request.status === 'pending' && (
                    <>
                      <button onClick={() => void review(request.id, 'approved')} disabled={busyId === request.id} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                        {busyId === request.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Approve
                      </button>
                      <button onClick={() => void review(request.id, 'denied')} disabled={busyId === request.id} className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                        <X size={11} /> Deny
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}
    </section>
  );
}

function TenantExportSection() {
  const [requests, setRequests] = useState<TenantExportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/operations/exports', { cache: 'no-store' });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) { setError(payload.error?.message ?? 'Unable to load export requests.'); return; }
    setError(null);
    setRequests(payload.data);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function mark(id: string, status: 'processing' | 'ready' | 'failed' | 'cancelled') {
    setBusyId(id);
    const response = await fetch(`/api/admin/operations/exports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to update this export request.'); return; }
    await load();
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><DatabaseBackup size={15} /> Tenant export / offboarding requests</h2>
      <p className="mb-3 text-xs text-slate-500">No automated export or deletion worker exists yet — these statuses track manual fulfillment. Marking a request &quot;ready&quot; does not generate or send a file on its own.</p>
      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-xs text-slate-400">No export requests.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((request) => (
            <li key={request.id} className="rounded-xl border border-violet-50 px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-violet-900">{request.clinicName}</p>
                  <p className="text-xs text-slate-500">Requested by {request.requestedByEmail} · {formatManila(request.requestedAt)}</p>
                  {request.retentionUntil && <p className="text-xs text-slate-400">Retention until {formatManila(request.retentionUntil)}</p>}
                  {request.failureReason && <p className="text-xs text-red-600">{request.failureReason}</p>}
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${EXPORT_STATUS_STYLES[request.status]}`}>{request.status}</span>
                  {(request.status === 'requested' || request.status === 'processing') && (
                    <>
                      {request.status === 'requested' && (
                        <button onClick={() => void mark(request.id, 'processing')} disabled={busyId === request.id} className="rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60">Start processing</button>
                      )}
                      <button onClick={() => void mark(request.id, 'ready')} disabled={busyId === request.id} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Mark ready</button>
                      <button onClick={() => void mark(request.id, 'failed')} disabled={busyId === request.id} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">Mark failed</button>
                      <button onClick={() => void mark(request.id, 'cancelled')} disabled={busyId === request.id} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}
    </section>
  );
}

function PlatformInventorySection() {
  const [clinics, setClinics] = useState<ClinicSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const response = await fetch('/api/admin/operations/clinics', { cache: 'no-store' });
      const payload = await response.json();
      setLoading(false);
      if (response.ok) setClinics(payload.data);
    })();
  }, []);

  const active = clinics.filter((clinic) => clinic.status === 'active').length;

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><Building2 size={15} /> Platform inventory</h2>
      <p className="mb-3 text-xs text-slate-500">
        {loading ? 'Loading…' : `${active} active clinic${active === 1 ? '' : 's'} of ${clinics.length} total — this is the only live signal below.`}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'API error rate', note: 'Not yet wired to a live signal' },
          { label: 'Slow query alerts', note: 'Not yet wired to a live signal' },
          { label: 'Storage usage', note: 'Not yet wired to a live signal' },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl bg-slate-50 p-3 opacity-70">
            <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
            <p className="text-xs text-slate-400">{metric.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function OperationsClient() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-violet-100 p-3">
            <ShieldAlert className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Platform operations</h1>
            <p className="text-sm text-slate-500">Support access and tenant export/offboarding queues — no clinical record is opened silently.</p>
          </div>
        </header>

        <SupportAccessSection />
        <TenantExportSection />
        <PlatformInventorySection />
      </div>
    </main>
  );
}
