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

type FeatureOverride = {
  id: string;
  featureKey: string;
  isEnabled: boolean;
  reason: string;
  expiresAt: string | null;
};

type Props = {
  clinicId: string;
  availableFeatureKeys: string[];
  overrides: FeatureOverride[];
};

type ErrorResponse = { error?: { message?: string } };

function formatFeatureKey(value: string): string {
  return value
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}

function formatDate(value: string | null): string {
  if (!value) return 'No expiry';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

export default function FeatureOverrideManager({
  clinicId,
  availableFeatureKeys,
  overrides,
}: Props) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [removing, setRemoving] = useState<FeatureOverride | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function addOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const expiresAt = String(formData.get('expiresAt') ?? '').trim();
    setIsSubmitting(true);
    setError(null);
    const response = await fetch(`/api/admin/clinics/${clinicId}/feature-overrides`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        featureKey: formData.get('featureKey'),
        isEnabled: formData.get('isEnabled') === 'true',
        reason: formData.get('reason'),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    }).catch(() => null);
    await finishRequest(response, 'Feature override saved.', () => setIsAdding(false));
  }

  async function removeOverride() {
    if (!removing) return;
    setIsSubmitting(true);
    setError(null);
    const response = await fetch(
      `/api/admin/clinics/${clinicId}/feature-overrides/${removing.id}`,
      { method: 'DELETE' },
    ).catch(() => null);
    await finishRequest(response, 'Feature override removed.', () => setRemoving(null));
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
      setError(payload.error?.message ?? 'The feature override could not be updated.');
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
          <h2 className="font-bold text-slate-900">Feature overrides</h2>
          <p className="mt-1 text-sm text-slate-500">Current unexpired exceptions.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setIsAdding(true);
          }}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700"
        >
          <Plus size={15} /> Add
        </button>
      </div>
      {success && (
        <p role="status" className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
          <CheckCircle2 size={14} /> {success}
        </p>
      )}
      {overrides.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No active overrides.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {overrides.map((override) => (
            <div key={override.id} className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-violet-900">{formatFeatureKey(override.featureKey)}</p>
                  <span className={`text-xs font-bold ${override.isEnabled ? 'text-emerald-700' : 'text-red-600'}`}>
                    {override.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setRemoving(override);
                  }}
                  aria-label={`Remove ${formatFeatureKey(override.featureKey)} override`}
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <p className="mt-1 text-xs leading-5 text-violet-700">{override.reason}</p>
              <p className="mt-2 text-xs text-violet-500">Expires: {formatDate(override.expiresAt)}</p>
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
            aria-labelledby="override-dialog-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <DialogHeader
              id="override-dialog-title"
              title="Add feature override"
              onClose={() => setIsAdding(false)}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-sm text-slate-500">Overrides take precedence over the assigned package.</p>
            {error && <ErrorMessage message={error} />}
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Feature
                <select name="featureKey" defaultValue="" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" autoFocus required>
                  <option value="" disabled>Select a feature</option>
                  {availableFeatureKeys.map((key) => (
                    <option key={key} value={key}>{formatFeatureKey(key)}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Access
                <select name="isEnabled" defaultValue="true" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
                  <option value="true">Enable feature</option>
                  <option value="false">Disable feature</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Reason
                <textarea name="reason" minLength={3} maxLength={500} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
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
          <div role="alertdialog" aria-modal="true" aria-labelledby="remove-override-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <DialogHeader id="remove-override-title" title="Remove feature override?" onClose={() => setRemoving(null)} disabled={isSubmitting} />
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {formatFeatureKey(removing.featureKey)} will return to its package-defined value. This action is audited.
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
