'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  ShieldAlert, DatabaseBackup, Building2, AlertCircle, Loader2,
  Check, X, Clock3, Play, Download, Flag, Plus, Trash2,
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
  artifactReference: string | null;
  createdAt: string;
};

type ClinicSummary = { id: string; name: string; status: string; createdAt: string };

type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabledByDefault: boolean;
  clinics: Array<{ clinicId: string; clinicName: string }>;
};

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

  async function mark(id: string, status: 'processing' | 'failed' | 'cancelled') {
    setBusyId(id);
    const response = await fetch(`/api/admin/operations/exports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to update this export request.'); return; }
    await load();
  }

  async function generate(id: string) {
    setBusyId(id);
    setError(null);
    const response = await fetch(`/api/admin/operations/exports/${id}/generate`, { method: 'POST' });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to generate this export.'); return; }
    await load();
  }

  async function download(id: string) {
    setBusyId(id);
    setError(null);
    const response = await fetch(`/api/admin/operations/exports/${id}/download-url`);
    const payload = await response.json();
    setBusyId(null);
    if (!response.ok) { setError(payload.error?.message ?? 'Unable to get a download link.'); return; }
    window.location.href = payload.data.downloadUrl;
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><DatabaseBackup size={15} /> Tenant export / offboarding requests</h2>
      <p className="mb-3 text-xs text-slate-500">Generating an export produces a real, structured JSON snapshot of the clinic&apos;s records. Uploaded file binaries, staff accounts, and audit logs are not included — see the export document&apos;s own manifest for the exact scope. No deletion/offboarding automation exists yet.</p>
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
                      <button onClick={() => void generate(request.id)} disabled={busyId === request.id} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                        {busyId === request.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />} Generate export
                      </button>
                      <button onClick={() => void mark(request.id, 'failed')} disabled={busyId === request.id} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">Mark failed</button>
                      <button onClick={() => void mark(request.id, 'cancelled')} disabled={busyId === request.id} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
                    </>
                  )}
                  {request.status === 'ready' && request.artifactReference && (
                    <button onClick={() => void download(request.id)} disabled={busyId === request.id} className="flex items-center gap-1 rounded-lg bg-violet-600 px-2 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                      {busyId === request.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Download
                    </button>
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

function FeatureFlagsSection() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [clinics, setClinics] = useState<ClinicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [targetClinicId, setTargetClinicId] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [flagsResponse, clinicsResponse] = await Promise.all([
      fetch('/api/admin/operations/feature-flags', { cache: 'no-store' }),
      fetch('/api/admin/operations/clinics', { cache: 'no-store' }),
    ]);
    const flagsPayload = await flagsResponse.json();
    const clinicsPayload = await clinicsResponse.json();
    setLoading(false);
    if (!flagsResponse.ok) { setError(flagsPayload.error?.message ?? 'Unable to load feature flags.'); return; }
    setError(null);
    setFlags(flagsPayload.data);
    if (clinicsResponse.ok) setClinics(clinicsPayload.data);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createFlag(event: FormEvent) {
    event.preventDefault();
    setBusyId('create'); setError(null);
    const response = await fetch('/api/admin/operations/feature-flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, name }) });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to create this feature flag.'); return; }
    setKey(''); setName('');
    await load();
  }

  async function setRollout(flagId: string, enabledByDefault: boolean) {
    setBusyId(flagId);
    const response = await fetch(`/api/admin/operations/feature-flags/${flagId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabledByDefault }) });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to update this rollout.'); return; }
    await load();
  }

  async function addClinic(flagId: string) {
    const clinicId = targetClinicId[flagId];
    if (!clinicId) return;
    setBusyId(flagId);
    const response = await fetch(`/api/admin/operations/feature-flags/${flagId}/clinics/${clinicId}`, { method: 'POST' });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to target this clinic.'); return; }
    setTargetClinicId((current) => ({ ...current, [flagId]: '' }));
    await load();
  }

  async function removeClinic(flagId: string, clinicId: string) {
    setBusyId(flagId);
    const response = await fetch(`/api/admin/operations/feature-flags/${flagId}/clinics/${clinicId}`, { method: 'DELETE' });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to remove this clinic.'); return; }
    await load();
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><Flag size={15} /> Feature-flag rollout</h2>
      <p className="mb-3 text-xs text-slate-500">Target a new feature at a subset of clinics before flipping it on for everyone. Application code decides what each flag key gates — creating one here only controls who it applies to.</p>
      <form onSubmit={createFlag} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
        <label className="text-xs font-semibold text-slate-600">Key<input required value={key} onChange={(event) => setKey(event.target.value)} placeholder="new-odontogram" className="mt-1 block h-9 w-44 rounded-lg border border-violet-200 px-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="New odontogram" className="mt-1 block h-9 w-56 rounded-lg border border-violet-200 px-2 text-sm" /></label>
        <button disabled={busyId === 'create'} className="flex h-9 items-center gap-1 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white disabled:opacity-60">
          {busyId === 'create' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add flag
        </button>
      </form>
      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : flags.length === 0 ? (
        <p className="text-xs text-slate-400">No feature flags yet.</p>
      ) : (
        <ul className="space-y-2">
          {flags.map((flag) => {
            const untargeted = clinics.filter((clinic) => !flag.clinics.some((row) => row.clinicId === clinic.id));
            return (
              <li key={flag.id} className="rounded-xl border border-violet-50 px-3 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-violet-900">{flag.name} <span className="font-mono text-xs text-slate-400">{flag.key}</span></p>
                    <p className="text-xs text-slate-500">{flag.enabledByDefault ? 'Enabled for every clinic' : `Targeted at ${flag.clinics.length} clinic${flag.clinics.length === 1 ? '' : 's'}`}</p>
                  </div>
                  <button onClick={() => void setRollout(flag.id, !flag.enabledByDefault)} disabled={busyId === flag.id} className={`rounded-lg px-2 py-1 text-xs font-semibold disabled:opacity-60 ${flag.enabledByDefault ? 'border border-slate-200 text-slate-500 hover:bg-slate-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                    {flag.enabledByDefault ? 'Revert to subset' : 'Roll out to everyone'}
                  </button>
                </div>
                {!flag.enabledByDefault && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {flag.clinics.map((row) => (
                      <span key={row.clinicId} className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                        {row.clinicName}
                        <button onClick={() => void removeClinic(flag.id, row.clinicId)} disabled={busyId === flag.id} className="text-violet-400 hover:text-red-600"><Trash2 size={10} /></button>
                      </span>
                    ))}
                    <select value={targetClinicId[flag.id] ?? ''} onChange={(event) => setTargetClinicId((current) => ({ ...current, [flag.id]: event.target.value }))} className="h-7 rounded-lg border border-violet-200 px-1.5 text-xs">
                      <option value="">Add clinic…</option>
                      {untargeted.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
                    </select>
                    <button onClick={() => void addClinic(flag.id)} disabled={busyId === flag.id || !targetClinicId[flag.id]} className="rounded-lg border border-violet-200 px-2 py-0.5 text-xs font-semibold text-violet-700 disabled:opacity-50">Add</button>
                  </div>
                )}
              </li>
            );
          })}
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
        <FeatureFlagsSection />
        <PlatformInventorySection />
      </div>
    </main>
  );
}
