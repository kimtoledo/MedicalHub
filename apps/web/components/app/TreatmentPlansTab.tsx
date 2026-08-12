'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Printer,
  Trash2,
  XCircle,
} from 'lucide-react';

type ServiceOption = { id: string; name: string };
type TreatmentRecord = { id: string; serviceId: string | null };
type PlanItem = {
  id: string;
  serviceId: string | null;
  serviceName: string | null;
  toothRef: string | null;
  area: string | null;
  estimatedFeePhp: string;
  priority: string;
  sequence: number;
  status: string;
};
type Plan = {
  id: string;
  title: string;
  notes: string | null;
  status: 'draft' | 'approved' | 'archived';
  dentistName: string | null;
  items: PlanItem[];
};
type DraftItem = {
  serviceId: string;
  toothRef: string;
  area: string;
  estimatedFeePhp: string;
  priority: 'low' | 'medium' | 'high';
  notes: string;
};

const itemTransitions: Record<string, string | undefined> = {
  proposed: 'accepted',
  accepted: 'scheduled',
  scheduled: 'in_progress',
  in_progress: 'completed',
};

function newDraftItem(): DraftItem {
  return {
    serviceId: '',
    toothRef: '',
    area: '',
    estimatedFeePhp: '',
    priority: 'medium',
    notes: '',
  };
}

function peso(value: string) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(value || 0));
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  );
}

export default function TreatmentPlansTab({
  clinicId,
  patientId,
  canManage,
}: {
  clinicId: string;
  patientId: string;
  canManage: boolean;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([newDraftItem()]);
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.estimatedFeePhp || 0), 0),
    [items],
  );

  const url = (path: string) =>
    `/api/clinic/${path}${path.includes('?') ? '&' : '?'}clinicId=${encodeURIComponent(clinicId)}`;

  const load = async () => {
    setLoading(true);
    const [plansRes, servicesRes, treatmentsRes] = await Promise.all([
      fetch(url(`patients/${patientId}/treatment-plans`)),
      fetch(url('services')),
      fetch(url(`patients/${patientId}/treatments`)),
    ]);

    if (!plansRes.ok) {
      setError('Unable to load treatment plans.');
      setLoading(false);
      return;
    }

    setPlans((await plansRes.json()).data);
    if (servicesRes.ok) setServices((await servicesRes.json()).data);
    if (treatmentsRes.ok) setTreatments((await treatmentsRes.json()).data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [clinicId, patientId]);

  const updateDraft = (index: number, patch: Partial<DraftItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!title.trim() || items.some((item) => !item.serviceId || !item.estimatedFeePhp)) {
      setError('Add a title, service, and estimated fee for every plan item.');
      return;
    }

    setSaving(true);
    const response = await fetch(url(`patients/${patientId}/treatment-plans`), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title,
        notes,
        items: items.map((item, index) => ({ ...item, sequence: index + 1 })),
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? 'Unable to create treatment plan.');
      setSaving(false);
      return;
    }

    setTitle('');
    setNotes('');
    setItems([newDraftItem()]);
    setSaving(false);
    await load();
  };

  const patchPlan = async (planId: string, body: object) => {
    setError(null);
    const response = await fetch(url(`treatment-plans/${planId}`), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? 'Unable to update treatment plan.');
      return;
    }
    await load();
  };

  const updateItemStatus = async (plan: Plan, item: PlanItem, status: string) => {
    setError(null);
    const record =
      status === 'completed'
        ? treatments.find((treatment) => treatment.serviceId === item.serviceId)
        : undefined;
    if (status === 'completed' && !record) {
      setError('Record the matching performed treatment before completing this plan item.');
      return;
    }

    const response = await fetch(url(`treatment-plans/${plan.id}/items/${item.id}/status`), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status,
        ...(record ? { treatmentRecordId: record.id } : {}),
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? 'Unable to update plan item.');
      return;
    }
    await load();
  };

  const print = (plan: Plan) => {
    const popup = window.open('', '_blank');
    if (!popup) {
      setError('Please allow pop-ups to print this treatment plan.');
      return;
    }
    popup.opener = null;
    const rows = plan.items
      .map(
        (item) =>
          `<tr><td>${item.sequence}</td><td>${escapeHtml(item.serviceName ?? 'Service')}</td><td>${escapeHtml(item.toothRef ?? item.area ?? '—')}</td><td>${peso(item.estimatedFeePhp)}</td><td>${escapeHtml(item.status)}</td></tr>`,
      )
      .join('');
    const totalFee = plan.items.reduce(
      (sum, item) => sum + Number(item.estimatedFeePhp),
      0,
    );

    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(plan.title)}</title><style>body{font-family:Inter,Arial,sans-serif;color:#1e1b4b;padding:42px}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border-bottom:1px solid #ddd;padding:10px;text-align:left}th{color:#5b5680;font-size:12px;text-transform:uppercase}.total{font-size:18px;font-weight:700;text-align:right;margin-top:18px}@media print{body{padding:0}}</style></head><body><p>Dentra.ph Treatment Plan</p><h1>${escapeHtml(plan.title)}</h1><p>Status: ${escapeHtml(plan.status)} · Prepared by ${escapeHtml(plan.dentistName ?? 'Clinic dentist')}</p>${plan.notes ? `<p>${escapeHtml(plan.notes)}</p>` : ''}<table><thead><tr><th>#</th><th>Procedure</th><th>Tooth / Area</th><th>Estimate</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Estimated total: ${peso(String(totalFee))}</p></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-5 text-sm text-violet-600">
        <Loader2 size={16} className="animate-spin" /> Loading treatment plans…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {canManage && (
        <form onSubmit={create} className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-violet-600" />
            <h3 className="font-bold text-violet-900">New treatment plan</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Plan title" className="h-10 rounded-lg border border-violet-200 bg-white px-3 text-sm" required />
            <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes" className="h-10 rounded-lg border border-violet-200 bg-white px-3 text-sm" />
          </div>
          <div className="mt-4 space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-7">
                <select value={item.serviceId} onChange={(event) => updateDraft(index, { serviceId: event.target.value })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm sm:col-span-2" required>
                  <option value="">Service</option>
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
                <input value={item.toothRef} onChange={(event) => updateDraft(index, { toothRef: event.target.value })} placeholder="Tooth" className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
                <input value={item.area} onChange={(event) => updateDraft(index, { area: event.target.value })} placeholder="Area" className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
                <input value={item.estimatedFeePhp} onChange={(event) => updateDraft(index, { estimatedFeePhp: event.target.value })} placeholder="Fee (PHP)" inputMode="decimal" className="h-9 rounded-lg border border-slate-200 px-2 text-sm" required />
                <select value={item.priority} onChange={(event) => updateDraft(index, { priority: event.target.value as DraftItem['priority'] })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
                <button type="button" onClick={() => setItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Remove plan item">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setItems((current) => [...current, newDraftItem()])} className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700">
              <Plus size={16} /> Add procedure
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-violet-900">Estimate: {peso(String(total))}</span>
              <button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:bg-violet-300">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Create plan
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {plans.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No treatment plans yet.</p> : plans.map((plan) => (
          <article key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">{plan.title}</h3><span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold capitalize text-violet-700">{plan.status}</span></div>
                <p className="mt-1 text-sm text-slate-500">{plan.dentistName ?? 'Clinic dentist'} · {plan.notes ?? 'No notes'}</p>
              </div>
              <div className="flex gap-2">
                {plan.status === 'approved' && <button onClick={() => print(plan)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700"><Printer size={15} /> Print</button>}
                {canManage && plan.status === 'draft' && <button onClick={() => void patchPlan(plan.id, { status: 'approved' })} className="inline-flex h-9 items-center gap-1 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white"><CheckCircle2 size={15} /> Approve</button>}
              </div>
            </div>
            <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
              {plan.items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.sequence}. {item.serviceName ?? 'Service'} {item.toothRef ? `· ${item.toothRef}` : item.area ? `· ${item.area}` : ''}</p>
                    <p className="text-xs text-slate-500">{peso(item.estimatedFeePhp)} · {item.priority} priority · {item.status}</p>
                  </div>
                  {canManage && plan.status === 'approved' && itemTransitions[item.status] && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => void updateItemStatus(plan, item, itemTransitions[item.status]!)} className="text-sm font-semibold text-violet-700">Mark {itemTransitions[item.status]?.replace('_', ' ')}</button>
                      <button onClick={() => void updateItemStatus(plan, item, 'cancelled')} className="inline-flex items-center gap-1 text-sm font-semibold text-red-700"><XCircle size={15} /> Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
