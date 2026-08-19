'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Package, X } from 'lucide-react';
import type { AdminClinicPackageOption } from '@/lib/admin-clinics';

type Props = {
  clinicId: string;
  clinicName: string;
  currentPackageId: string | null;
  packages: AdminClinicPackageOption[];
};

type ErrorResponse = { error?: { message?: string } };

function todayInManila(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export default function ClinicPackageAction({
  clinicId,
  clinicName,
  currentPackageId,
  packages,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) setIsOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isOpen, isSubmitting]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedPackage = packages.find(
      (item) => item.id === formData.get('packageId'),
    );
    if (!selectedPackage) return;

    const negotiatedPricePhp = String(formData.get('negotiatedPricePhp') ?? '').trim();
    const billingNote = String(formData.get('billingNote') ?? '').trim();

    setIsSubmitting(true);
    setError(null);
    const response = await fetch(`/api/admin/clinics/${clinicId}/package`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        packageId: selectedPackage.id,
        effectiveDate: formData.get('effectiveDate'),
        negotiatedPricePhp: negotiatedPricePhp || undefined,
        billingNote: billingNote || undefined,
      }),
    }).catch(() => null);

    if (!response) {
      setError('Unable to reach the server. Check that the API is running.');
      setIsSubmitting(false);
      return;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ErrorResponse;
      setError(payload.error?.message ?? 'The package could not be assigned.');
      setIsSubmitting(false);
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as { data?: { warnings?: string[] } };
    setWarnings(payload.data?.warnings ?? []);
    setSuccess(`${selectedPackage.name} was scheduled successfully.`);
    setIsSubmitting(false);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setSuccess(null);
          setWarnings([]);
          setIsOpen(true);
        }}
        disabled={packages.length === 0}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-violet-200 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Package size={15} /> Change package
      </button>
      {success && (
        <p role="status" className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 size={14} /> {success}
        </p>
      )}
      {warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {warnings.map((warning) => (
            <p key={warning} className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {warning}
            </p>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="package-dialog-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="package-dialog-title" className="text-lg font-bold text-slate-900">
                  Change clinic package
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select the package and effective date for {clinicName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                aria-label="Close package dialog"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle size={17} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Package</span>
                <select
                  name="packageId"
                  defaultValue=""
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  autoFocus
                  required
                >
                  <option value="" disabled>Select a package</option>
                  {packages.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={item.id === currentPackageId}
                    >
                      {item.name}{item.id === currentPackageId ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Effective date</span>
                <input
                  type="date"
                  name="effectiveDate"
                  min={todayInManila()}
                  defaultValue={todayInManila()}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Negotiated price (₱/month) <span className="font-normal text-slate-400">(optional — Branches tier custom contracts)</span></span>
                <input
                  type="text"
                  inputMode="decimal"
                  name="negotiatedPricePhp"
                  placeholder="e.g. 4500.00"
                  pattern="^\d+(\.\d{1,2})?$"
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Billing note <span className="font-normal text-slate-400">(optional)</span></span>
                <textarea
                  name="billingNote"
                  rows={2}
                  maxLength={1000}
                  placeholder="Contract terms, invoicing schedule, etc."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                The current subscription remains effective until this date. Only one future package change may be scheduled at a time.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-violet-300"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Assigning…' : 'Confirm package change'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
