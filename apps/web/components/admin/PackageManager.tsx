'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Building2, Check, Gauge, Loader2, Pencil, Plus, Save, X } from 'lucide-react';
import type { AdminPackageItem } from '@/lib/admin-packages';

type Props = { items: AdminPackageItem[]; featureCatalog: string[]; capacityMetricCatalog: string[] };
type Draft = { id?: string; name: string; slug: string; description: string; priceDisplay: string; isActive: boolean; featureKeys: string[]; limits: Partial<Record<string, number | null>> };
const emptyDraft: Draft = { name: '', slug: '', description: '', priceDisplay: 'Contact us', isActive: true, featureKeys: [], limits: {} };
const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100';
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const labelFeature = (key: string) => key.split('.').map((part) => part.replace(/_/g, ' ')).join(' · ');

export default function PackageManager({ items, featureCatalog, capacityMetricCatalog }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function edit(item?: AdminPackageItem) {
    setError(null); setSlugEdited(Boolean(item));
    setDraft(item ? { id: item.id, name: item.name, slug: item.slug, description: item.description ?? '', priceDisplay: item.priceDisplay, isActive: item.isActive, featureKeys: [...item.featureKeys], limits: { ...item.limits } } : { ...emptyDraft, featureKeys: [], limits: {} });
  }
  function toggleFeature(key: string) {
    if (!draft) return;
    setDraft({ ...draft, featureKeys: draft.featureKeys.includes(key) ? draft.featureKeys.filter((value) => value !== key) : [...draft.featureKeys, key] });
  }
  /** value === undefined clears the metric entirely (absent = deny-by-default). null = unlimited. */
  function setLimit(metric: string, value: number | null | undefined) {
    if (!draft) return;
    const limits = { ...draft.limits };
    if (value === undefined) delete limits[metric]; else limits[metric] = value;
    setDraft({ ...draft, limits });
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return; setBusy(true); setError(null);
    const response = await fetch(draft.id ? `/api/admin/packages/${draft.id}` : '/api/admin/packages', {
      method: draft.id ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: draft.name, slug: draft.slug, description: draft.description, priceDisplay: draft.priceDisplay, isActive: draft.isActive, featureKeys: draft.featureKeys, limits: draft.limits }),
    }).catch(() => null);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => ({})) as { error?: { message?: string } } : {};
      setError(payload.error?.message ?? 'Unable to save the package.'); setBusy(false); return;
    }
    setDraft(null); setBusy(false); router.refresh();
  }

  return <>
    <div className="flex justify-end"><button type="button" onClick={() => edit()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700"><Plus size={17} /> Create package</button></div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="font-bold text-slate-900">{item.name}</h2><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></div><p className="mt-1 font-mono text-xs text-slate-400">{item.slug}</p></div><button type="button" onClick={() => edit(item)} aria-label={`Edit ${item.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-violet-700"><Pencil size={16} /></button></div>
        <p className="mt-4 text-2xl font-bold text-violet-700">{item.priceDisplay}</p><p className="mt-2 min-h-10 text-sm text-slate-500">{item.description ?? 'No package description.'}</p>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="inline-flex items-center gap-2 text-slate-600"><Check size={15} className="text-emerald-600" />{item.featureKeys.length} features</span><span className="inline-flex items-center gap-2 text-slate-600"><Gauge size={15} className="text-amber-500" />{Object.keys(item.limits).length} limits</span><span className="inline-flex items-center gap-2 text-slate-600"><Building2 size={15} className="text-violet-500" />{item.activeClinicCount} clinics</span></div>
      </article>)}
    </div>
    {draft && <div className="fixed inset-0 z-50 flex justify-end"><button type="button" aria-label="Close package editor" onClick={() => !busy && setDraft(null)} className="absolute inset-0 bg-slate-950/35" /><aside role="dialog" aria-modal="true" aria-labelledby="package-editor-title" className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5"><div><h2 id="package-editor-title" className="text-xl font-bold text-slate-900">{draft.id ? 'Edit package' : 'Create package'}</h2><p className="mt-1 text-sm text-slate-500">Feature keys are the authoritative access-control mapping.</p></div><button type="button" disabled={busy} onClick={() => setDraft(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div>
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col"><div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">{error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} />{error}</div>}
        <div className="grid gap-5 sm:grid-cols-2"><label><span className="text-sm font-semibold text-slate-700">Name</span><input className={inputClass} value={draft.name} onChange={(event) => { const name = event.target.value; setDraft({ ...draft, name, slug: slugEdited ? draft.slug : slugify(name) }); }} minLength={2} maxLength={100} required /></label><label><span className="text-sm font-semibold text-slate-700">Slug</span><input className={inputClass} value={draft.slug} onChange={(event) => { setSlugEdited(true); setDraft({ ...draft, slug: slugify(event.target.value) }); }} minLength={2} maxLength={80} required /></label><label><span className="text-sm font-semibold text-slate-700">Price display</span><input className={inputClass} value={draft.priceDisplay} onChange={(event) => setDraft({ ...draft, priceDisplay: event.target.value })} maxLength={50} placeholder="₱1,499 / month" required /></label><label className="flex items-end gap-3 pb-2"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600" /><span className="text-sm font-semibold text-slate-700">Available for assignment</span></label><label className="sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Description</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={1000} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label></div>
        <div><h3 className="text-sm font-semibold text-slate-800">Feature catalog</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{featureCatalog.map((key) => <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${draft.featureKeys.includes(key) ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-600'}`}><input type="checkbox" checked={draft.featureKeys.includes(key)} onChange={() => toggleFeature(key)} className="h-4 w-4 rounded border-slate-300 text-violet-600" /><span className="capitalize">{labelFeature(key)}</span></label>)}</div></div>
        <div><h3 className="text-sm font-semibold text-slate-800">Capacity limits</h3><p className="mt-1 text-xs text-slate-500">Leave blank to deny (0). Check Unlimited to remove the cap entirely.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{capacityMetricCatalog.map((metric) => { const value = draft.limits[metric]; const unlimited = value === null; return <div key={metric} className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${value !== undefined ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}><span className="flex-1 capitalize text-slate-700">{labelFeature(metric)}</span><input type="number" min={0} inputMode="numeric" placeholder="0" disabled={unlimited} value={unlimited || value === undefined ? '' : value} onChange={(event) => { const raw = event.target.value; setLimit(metric, raw === '' ? undefined : Math.max(0, Number(raw))); }} className="h-9 w-16 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400" /><label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500"><input type="checkbox" checked={unlimited} onChange={(event) => setLimit(metric, event.target.checked ? null : undefined)} className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600" />Unlimited</label></div>; })}</div></div>
      </div><div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4"><button type="button" disabled={busy} onClick={() => setDraft(null)} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-violet-300">{busy ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{busy ? 'Saving…' : 'Save package'}</button></div></form>
    </aside></div>}
  </>;
}
