'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

type LimitOverride = {
  id: string;
  metric: string;
  limit: number | null;
  reason: string;
  expiresAt: string | null;
};

type Props = {
  clinicId: string;
  availableMetrics: string[];
  overrides: LimitOverride[];
};

type ErrorResponse = { error?: { message?: string } };

function formatMetric(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string | null): string {
  if (!value) return 'No expiry';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

export default function LimitOverrideManager({
  clinicId,
  availableMetrics,
  overrides,
}: Props) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [removing, setRemoving] = useState<LimitOverride | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function addOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const expiresAt = String(formData.get('expiresAt') ?? '').trim();
    const limitInput = String(formData.get('limit') ?? '').trim();
    setIsSubmitting(true);
    setError(null);
    const response = await fetch(`/api/admin/clinics/${clinicId}/limit-overrides`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        metric: formData.get('metric'),
        limit: unlimited ? null : Math.max(0, Number(limitInput || '0')),
        reason: formData.get('reason'),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    }).catch(() => null);
    await finishRequest(response, 'Capacity override saved.', () => { setIsAdding(false); setUnlimited(false); });
  }

  async function removeOverride() {
    if (!removing) return;
    setIsSubmitting(true);
    setError(null);
    const response = await fetch(
      `/api/admin/clinics/${clinicId}/limit-overrides/${removing.id}`,
      { method: 'DELETE' },
    ).catch(() => null);
    await finishRequest(response, 'Capacity override removed.', () => setRemoving(null));
  }

  async function finishRequest(
    response: Response | null,
    message: string,
    close: () => void,
  ) {
    if (!response) {
      setError('Unable to reach the server. Check that the API is running.');
      setIsSubmitting(false);
      return;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ErrorResponse;
      setError(payload.error?.message ?? 'The capacity override could not be updated.');
      setIsSubmitting(false);
      return;
    }
    setSuccess(message);
    setIsSubmitting(false);
    close();
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Capacity overrides</h2>
          <p className="mt-1 text-sm text-slate-500">Custom seat/branch limits for this clinic (used by the Branches tier).</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setUnlimited(false);
            setIsAdding(true);
          }}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700"
        >
          <Plus size={15} /> Add
        </button>
      </div>
      {success && (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 size={14} /> {success}
        </p>
      )}
      {overrides.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No active capacity overrides — this clinic uses its package&apos;s default limits.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {overrides.map((override) => (
            <div key={override.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-amber-900">{formatMetric(override.metric)}</p>
                  <span className="text-xs font-bold text-amber-700">
                    {override.limit === null ? 'Unlimited' : `Limit: ${override.limit}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setRemoving(override);
                  }}
                  aria-label={`Remove ${formatMetric(override.metric)} override`}
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <p className="mt-1 text-xs leading-5 text-amber-700">{override.reason}</p>
              <p className="mt-2 text-xs text-amber-500">Expires: {formatDate(override.expiresAt)}</p>
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={addOverride}
            role="dialog"
            aria-modal="true"
            aria-labelledby="limit-override-dialog-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <DialogHeader
              id="limit-override-dialog-title"
              title="Add capacity override"
              onClose={() => setIsAdding(false)}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-sm text-slate-500">Overrides take precedence over the assigned package&apos;s default limit. Existing dentists/branches/staff are never removed by a lower limit — it only blocks further growth.</p>
            {error && <ErrorMessage message={error} />}
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Metric
                <select name="metric" defaultValue="" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" autoFocus required>
                  <option value="" disabled>Select a metric</option>
                  {availableMetrics.map((metric) => (
                    <option key={metric} value={metric}>{formatMetric(metric)}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-3">
                <label className="flex-1 text-sm font-semibold text-slate-700">
                  Limit
                  <input type="number" name="limit" min={0} disabled={unlimited} defaultValue={0} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm disabled:bg-slate-100 disabled:text-slate-400" />
                </label>
                <label className="flex items-center gap-2 pb-3 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={unlimited} onChange={(event) => setUnlimited(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
                  Unlimited
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Reason
                <textarea name="reason" minLength={3} maxLength={500} rows={3} placeholder="e.g. Initial Branches contract: 3 branches" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Expiry <span className="font-normal text-slate-400">(optional)</span>
                <input type="datetime-local" name="expiresAt" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
              </label>
            </div>
            <DialogActions
              cancel={() => setIsAdding(false)}
              submitting={isSubmitting}
              submitLabel="Save override"
            />
          </form>
        </div>
      )}

      {removing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="remove-limit-override-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <DialogHeader id="remove-limit-override-title" title="Remove capacity override?" onClose={() => setRemoving(null)} disabled={isSubmitting} />
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {formatMetric(removing.metric)} will return to the package&apos;s default limit. This action is audited.
            </p>
            {error && <ErrorMessage message={error} />}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" autoFocus onClick={() => setRemoving(null)} disabled={isSubmitting} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Cancel</button>
              <button type="button" onClick={() => void removeOverride()} disabled={isSubmitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:bg-red-300">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Removing…' : 'Confirm removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DialogHeader({ id, title, onClose, disabled }: { id: string; title: string; onClose: () => void; disabled: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <h2 id={id} className="text-lg font-bold text-slate-900">{title}</h2>
      <button type="button" onClick={onClose} disabled={disabled} aria-label="Close dialog" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" /> {message}</div>;
}

function DialogActions({ cancel, submitting, submitLabel }: { cancel: () => void; submitting: boolean; submitLabel: string }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
      <button type="button" onClick={cancel} disabled={submitting} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Cancel</button>
      <button type="submit" disabled={submitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:bg-violet-300">
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}
