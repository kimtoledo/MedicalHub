'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeftRight, Check, Loader2, X } from 'lucide-react';

type Referral = {
  id: string;
  sourceClinicId: string;
  targetClinicId: string;
  sourceClinicName: string;
  targetClinicName: string;
  sourcePatientFirstName: string;
  sourcePatientLastName: string;
  reason: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt: string | null;
};

const STATUS_STYLES: Record<Referral['status'], string> = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
};

export default function ReferralsClient({ clinicId }: { clinicId: string }) {
  const [rows, setRows] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sourcePatientId, setSourcePatientId] = useState('');
  const [targetClinicId, setTargetClinicId] = useState('');
  const [reason, setReason] = useState('');
  const [consented, setConsented] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const response = await fetch(`/api/clinic/patient-referrals?clinicId=${clinicId}`, { credentials: 'include', cache: 'no-store' });
    setLoading(false);
    if (!response.ok) { setError('Unable to load referrals.'); return; }
    setError(null);
    setRows((await response.json()).data);
  };

  useEffect(() => { void load(); }, [clinicId]);

  async function createReferral(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setMessage(null);
    const response = await fetch(`/api/clinic/patient-referrals?clinicId=${clinicId}`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourcePatientId, targetClinicId, reason, consented }) });
    setSaving(false);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to create the referral.'); return; }
    setSourcePatientId(''); setTargetClinicId(''); setReason(''); setConsented(false);
    setMessage('Referral created and shared with the target clinic.');
    await load();
  }

  async function respond(referralId: string, action: 'accept' | 'decline') {
    setBusyId(referralId); setError(null); setMessage(null);
    const response = await fetch(`/api/clinic/patient-referrals/${referralId}/${action}?clinicId=${clinicId}`, { method: 'POST', credentials: 'include' });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? `Unable to ${action} this referral.`); return; }
    setMessage(action === 'accept' ? 'Referral accepted — a new patient record was created at this clinic.' : 'Referral declined.');
    await load();
  }

  return (
    <div className="max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-violet-100 p-3"><ArrowLeftRight className="text-violet-600" /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient referrals</h1>
          <p className="mt-1 text-sm text-slate-500">Refer a patient to another clinic in your dental group, with their explicit consent. Each clinic keeps its own record — accepting creates a new record at the receiving clinic.</p>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      <form onSubmit={createReferral} className="grid gap-3 rounded-2xl border border-violet-100 bg-white p-5 sm:grid-cols-2">
        <h2 className="font-bold text-violet-950 sm:col-span-2">Refer a patient</h2>
        <label className="text-sm font-semibold">Patient ID<input required value={sourcePatientId} onChange={(event) => setSourcePatientId(event.target.value)} placeholder="Copy from the patient's profile URL" className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label>
        <label className="text-sm font-semibold">Target clinic ID<input required value={targetClinicId} onChange={(event) => setTargetClinicId(event.target.value)} placeholder="Must be in the same dental group" className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Reason for referral<textarea required minLength={10} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2" /></label>
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" required checked={consented} onChange={(event) => setConsented(event.target.checked)} /> The patient has given explicit consent to share their record with the target clinic</label>
        <button disabled={saving} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Creating…' : 'Create referral'}</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-14"><Loader2 className="animate-spin text-violet-600" /></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-slate-500"><ArrowLeftRight size={32} className="text-violet-200" /><p className="text-sm">No referrals yet.</p></div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isIncoming = row.targetClinicId === clinicId && row.status === 'pending';
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-900">{row.sourcePatientFirstName} {row.sourcePatientLastName}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[row.status]}`}>{row.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{row.sourceClinicName} → {row.targetClinicName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.reason}</p>
                  </div>
                  {isIncoming && (
                    <div className="flex gap-2">
                      <button onClick={() => void respond(row.id, 'accept')} disabled={busyId === row.id} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"><Check size={15} /> Accept</button>
                      <button onClick={() => void respond(row.id, 'decline')} disabled={busyId === row.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60"><X size={15} /> Decline</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
