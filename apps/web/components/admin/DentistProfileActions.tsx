'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, BadgeCheck, Eye, EyeOff, FileCheck2, Loader2, ShieldX } from 'lucide-react';

type Props = { dentistId: string; verificationStatus: 'unverified' | 'pending' | 'verified'; publicationStatus: string };
type PendingAction = 'verify' | 'revoke' | 'publish' | 'unpublish';
const config = {
  verify: { label: 'Verify dentist', path: 'verification', body: { verificationStatus: 'verified' }, icon: BadgeCheck, tone: 'bg-emerald-600 hover:bg-emerald-700' },
  revoke: { label: 'Revoke verification', path: 'verification', body: { verificationStatus: 'unverified' }, icon: ShieldX, tone: 'bg-red-600 hover:bg-red-700' },
  publish: { label: 'Publish profile', path: 'publication', body: { publicationStatus: 'published' }, icon: Eye, tone: 'bg-violet-600 hover:bg-violet-700' },
  unpublish: { label: 'Unpublish profile', path: 'publication', body: { publicationStatus: 'unpublished' }, icon: EyeOff, tone: 'bg-amber-600 hover:bg-amber-700' },
} as const;

export default function DentistProfileActions({ dentistId, verificationStatus, publicationStatus }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const verificationAction: PendingAction = verificationStatus === 'verified' ? 'revoke' : 'verify';
  const publicationAction: PendingAction = publicationStatus === 'published' ? 'unpublish' : 'publish';
  const actions: PendingAction[] = [verificationAction, publicationAction];

  async function confirm() {
    if (!pending) return;
    const verificationChange = pending === 'verify' || pending === 'revoke';
    if (verificationChange && reason.trim().length < 3) { setError('Enter a written verification reason.'); return; }
    setBusy(true); setError(null);
    const action = config[pending];
    const response = await fetch(`/api/admin/dentists/${dentistId}/${action.path}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...action.body, ...(verificationChange ? { reason: reason.trim() } : {}) }) }).catch(() => null);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => ({})) as { error?: { message?: string } } : {};
      setError(payload.error?.message ?? 'Unable to update the dentist profile.'); setBusy(false); return;
    }
    setPending(null); setReason(''); setBusy(false); router.refresh();
  }

  return (
    <div className="mt-4 space-y-3 sm:mt-0">
      <div className="flex flex-wrap gap-2">
        <Link href="/dentra-admin/verifications" className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-700 hover:bg-violet-50"><FileCheck2 size={15} /> Verification queue</Link>
        {actions.map((name) => {
          const action = config[name]; const Icon = action.icon;
          const disabled = name === 'publish' && verificationStatus !== 'verified';
          return <button key={name} type="button" disabled={busy || disabled} title={disabled ? 'Verify the dentist before publishing' : undefined} onClick={() => { setError(null); setPending(name); }} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Icon size={15} />{action.label}</button>;
        })}
      </div>
      {pending && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">Confirm: {config[pending].label.toLowerCase()}?</p>
          <p className="mt-1 text-xs text-slate-500">This platform action will be recorded in the audit log.{(pending === 'verify' || pending === 'revoke') ? ' A held Dentra.ph email preview will also be created when the dentist has an email address.' : ''}</p>
          {(pending === 'verify' || pending === 'revoke') && <label className="mt-3 block text-xs font-semibold text-slate-700">Written reason<textarea required minLength={3} maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal" placeholder="Example: PRC credentials reviewed and matched." /></label>}
          <div className="mt-3 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setPending(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white">Cancel</button><button type="button" disabled={busy} onClick={() => void confirm()} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white ${config[pending].tone}`}>{busy && <Loader2 size={13} className="animate-spin" />}Confirm</button></div>
        </div>
      )}
      {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={15} />{error}</div>}
    </div>
  );
}
