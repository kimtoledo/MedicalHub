'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Clock3, DollarSign, History, Loader2, Pencil, Plus, X } from 'lucide-react';

type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  durationMinutes: string;
  basePricePhp: string | null;
  pricePhp: string | null;
  priceSource: 'base' | 'branch';
  branchId: string | null;
  isBookable: boolean;
  isActive: boolean;
};
type Branch = { id: string; name: string };
type PriceHistory = { id: string; branchId: string | null; branchName: string | null; pricePhp: string | null; effectiveFrom: string; effectiveTo: string | null };
type Draft = { name: string; category: string; description: string; durationMinutes: string; pricePhp: string; isBookable: boolean; isActive: boolean };

const emptyDraft: Draft = { name: '', category: 'General', description: '', durationMinutes: '30', pricePhp: '', isBookable: true, isActive: true };

function formatPhp(amount: string | null) {
  if (!amount) return '—';
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function validatePrice(value: string) {
  return value === '' || /^\d+(?:\.\d{1,2})?$/.test(value);
}

export default function ServicesSettingsClient({ clinicId, isAdmin }: { clinicId: string; isAdmin: boolean }) {
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<PriceHistory[]>([]);

  const catalogUrl = (path: string) => `/api/clinic/${clinicId}/catalog/${path}`;

  const load = async () => {
    setLoading(true);
    setError(null);
    const branchQuery = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    const [servicesResponse, branchesResponse] = await Promise.all([
      fetch(`${catalogUrl('services')}${branchQuery}`, { credentials: 'include', cache: 'no-store' }),
      fetch(catalogUrl('branches'), { credentials: 'include', cache: 'no-store' }),
    ]);
    if (!servicesResponse.ok || !branchesResponse.ok) {
      setError('Unable to load the service catalog.');
      setLoading(false);
      return;
    }
    setServices((await servicesResponse.json()).data);
    setBranches((await branchesResponse.json()).data);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [clinicId, branchId]);

  const saveService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.category.trim() || !/^\d+$/.test(draft.durationMinutes) || Number(draft.durationMinutes) < 15 || Number(draft.durationMinutes) > 240 || !validatePrice(draft.pricePhp)) {
      setError('Enter a name, category, duration from 15–240 minutes, and a valid price.');
      return;
    }
    setSaving(true); setError(null);
    const response = await fetch(catalogUrl('services'), {
      method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ ...draft, durationMinutes: Number(draft.durationMinutes), pricePhp: draft.pricePhp || null }),
    });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to create service.'); setSaving(false); return; }
    setDraft(emptyDraft); setShowCreate(false); setSaving(false); await load();
  };

  const savePrice = async (service: Service) => {
    if (!validatePrice(priceDraft)) { setError('Enter a valid non-negative PHP amount.'); return; }
    setSaving(true); setError(null);
    const response = await fetch(catalogUrl(`services/${service.id}/price`), {
      method: 'PUT', headers: { 'content-type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ branchId: branchId || null, pricePhp: priceDraft === '' ? null : priceDraft }),
    });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to update price.'); setSaving(false); return; }
    setEditingId(null); setSaving(false); await load();
  };

  const toggleActive = async (service: Service) => {
    setSaving(true); setError(null);
    const response = await fetch(catalogUrl(`services/${service.id}`), {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ isActive: !service.isActive }),
    });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to update service.'); }
    setSaving(false); await load();
  };

  const loadHistory = async (serviceId: string) => {
    if (historyId === serviceId) { setHistoryId(null); return; }
    const response = await fetch(catalogUrl(`services/${serviceId}/price-history`), { credentials: 'include', cache: 'no-store' });
    if (!response.ok) { setError('Unable to load price history.'); return; }
    setHistory((await response.json()).data); setHistoryId(serviceId);
  };

  if (!isAdmin) return <div className="max-w-3xl p-4 sm:p-6 lg:p-8"><h1 className="text-2xl font-bold text-violet-900">Service Catalog</h1><p className="mt-2 text-sm text-violet-500">Only clinic owners and administrators can manage services and pricing.</p></div>;

  return (
    <div className="max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Service Catalog</h1><p className="mt-1 text-sm text-slate-500">Manage procedures, public booking visibility, and effective pricing.</p></div>
        <button onClick={() => { setShowCreate((value) => !value); setDraft(emptyDraft); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700"><Plus size={17} /> Add service</button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {showCreate && <form onSubmit={saveService} className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
        <div className="flex items-center justify-between"><h2 className="font-bold text-violet-900">New service</h2><button type="button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={18} /></button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold text-slate-700 lg:col-span-2">Name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal" /></label>
          <label className="text-sm font-semibold text-slate-700">Category<input required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal" /></label>
          <label className="text-sm font-semibold text-slate-700">Duration (minutes)<input required type="number" min="15" max="240" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal" /></label>
          <label className="text-sm font-semibold text-slate-700">Base price (PHP)<input inputMode="decimal" value={draft.pricePhp} onChange={(event) => setDraft({ ...draft, pricePhp: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal" placeholder="Optional" /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-3">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal" /></label>
          <div className="flex items-center gap-4 self-end pb-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={draft.isBookable} onChange={(event) => setDraft({ ...draft, isBookable: event.target.checked })} /> Public booking</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> Active</label></div>
        </div>
        <button disabled={saving} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save service</button>
      </form>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><div><p className="text-sm font-semibold text-slate-700">Pricing view</p><p className="text-xs text-slate-500">Choose a branch to view or edit its override; blank uses the clinic base price.</p></div><select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Clinic base price</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div>

      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
        {loading ? <div className="flex items-center justify-center py-14 text-violet-600"><Loader2 size={22} className="animate-spin" /></div> : services.length === 0 ? <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-500"><DollarSign size={32} className="text-violet-200" /><p className="text-sm">No services configured yet.</p></div> : <ul className="divide-y divide-slate-100">{services.map((service) => {
          const editing = editingId === service.id;
          const expanded = historyId === service.id;
          return <li key={service.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{service.name}</h3><span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">{service.category}</span>{!service.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Inactive</span>}{!service.isBookable && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Internal only</span>}</div><p className="mt-1 text-sm text-slate-500">{service.description ?? 'No description'}</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><Clock3 size={13} /> {service.durationMinutes} minutes</p></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-lg font-bold text-violet-900">{formatPhp(service.pricePhp)}</p><p className="text-[11px] text-slate-400">{service.priceSource === 'branch' ? 'Branch override' : 'Clinic base'}</p></div>{editing ? <div className="flex items-center gap-2"><input autoFocus value={priceDraft} onChange={(event) => setPriceDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void savePrice(service); if (event.key === 'Escape') setEditingId(null); }} placeholder="0.00" className="h-9 w-28 rounded-lg border border-violet-300 px-2 text-sm" /><button onClick={() => void savePrice(service)} disabled={saving} className="rounded-lg bg-emerald-100 p-2 text-emerald-700" aria-label="Save price"><Check size={15} /></button><button onClick={() => setEditingId(null)} className="rounded-lg bg-slate-100 p-2 text-slate-500" aria-label="Cancel"><X size={15} /></button></div> : <button onClick={() => { setEditingId(service.id); setPriceDraft(service.pricePhp ?? ''); }} className="rounded-lg p-2 text-violet-500 hover:bg-violet-50" aria-label={`Edit price for ${service.name}`}><Pencil size={16} /></button>}</div></div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs"><button onClick={() => void loadHistory(service.id)} className="inline-flex items-center gap-1 font-semibold text-violet-700">{expanded ? <ChevronUp size={14} /> : <History size={14} />} Price history</button><button onClick={() => void toggleActive(service)} disabled={saving} className="font-semibold text-slate-500 hover:text-violet-700">{service.isActive ? 'Deactivate' : 'Reactivate'}</button></div>
            {expanded && <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Effective price history</p>{history.length === 0 ? <p className="text-sm text-slate-500">No price history recorded.</p> : <div className="space-y-2">{history.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 text-sm"><span>{item.branchName ?? 'Clinic base'} · {formatDate(item.effectiveFrom)}{item.effectiveTo ? ` – ${formatDate(item.effectiveTo)}` : ' – current'}</span><span className="font-semibold text-violet-800">{formatPhp(item.pricePhp)}</span></div>)}</div>}</div>}
          </li>;
        })}</ul>}
      </div>
      <p className="text-xs text-slate-500">Prices are snapshotted when invoices are generated. Changing a service price never rewrites historical invoice line items.</p>
    </div>
  );
}
