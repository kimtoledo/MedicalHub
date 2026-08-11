'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Building2, Loader2, Plus, Trash2 } from 'lucide-react';

type Affiliation = { id: string; clinicId: string; clinicName: string; branchId: string; branchName: string };
type BranchOption = { clinicId: string; clinicName: string; branchId: string; branchName: string };
type Props = { dentistId: string; affiliations: Affiliation[]; availableBranches: BranchOption[] };
type ErrorResponse = { error?: { message?: string } };

export default function DentistAffiliationManager({ dentistId, affiliations, availableBranches }: Props) {
  const router = useRouter();
  const [branchId, setBranchId] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addAffiliation(event: FormEvent) {
    event.preventDefault();
    if (!branchId) return;
    setBusy(true); setError(null);
    const response = await fetch(`/api/admin/dentists/${dentistId}/affiliations`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ branchId }),
    }).catch(() => null);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => ({})) as ErrorResponse : {};
      setError(payload.error?.message ?? 'Unable to add the clinic affiliation.');
      setBusy(false); return;
    }
    setBranchId(''); setBusy(false); router.refresh();
  }

  async function removeAffiliation(affiliationId: string) {
    setBusy(true); setError(null);
    const response = await fetch(`/api/admin/dentists/${dentistId}/affiliations/${affiliationId}`, { method: 'DELETE' }).catch(() => null);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => ({})) as ErrorResponse : {};
      setError(payload.error?.message ?? 'Unable to remove the clinic affiliation.');
      setBusy(false); return;
    }
    setRemovingId(null); setBusy(false); router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Building2 size={18} className="text-violet-600" /> Clinic affiliations</h2>
      {error && <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} className="shrink-0" />{error}</div>}
      {affiliations.length === 0 ? <p className="mt-4 text-sm text-slate-500">No active clinic affiliations.</p> : (
        <ul className="mt-4 space-y-3">
          {affiliations.map((affiliation) => (
            <li key={affiliation.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">{affiliation.clinicName}</p>
              <div className="mt-1 flex items-center justify-between gap-2"><p className="text-xs text-slate-500">{affiliation.branchName}</p>
                {removingId === affiliation.id ? (
                  <div className="flex gap-1"><button type="button" disabled={busy} onClick={() => setRemovingId(null)} className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-white">Cancel</button><button type="button" disabled={busy} onClick={() => void removeAffiliation(affiliation.id)} className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Removing…' : 'Confirm'}</button></div>
                ) : <button type="button" disabled={busy} onClick={() => setRemovingId(affiliation.id)} aria-label={`Remove ${affiliation.branchName} affiliation`} className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={addAffiliation} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Add clinic branch</label>
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} disabled={busy || availableBranches.length === 0} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
          <option value="">{availableBranches.length ? 'Select a branch' : 'No branches available'}</option>
          {availableBranches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.clinicName} — {branch.branchName}</option>)}
        </select>
        <button type="submit" disabled={busy || !branchId} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-violet-300">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add affiliation
        </button>
      </form>
    </section>
  );
}
