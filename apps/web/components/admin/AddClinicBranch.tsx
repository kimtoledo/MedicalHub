'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  X,
} from 'lucide-react';

type BranchDraft = {
  name: string;
  isMain: boolean;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
};

type ErrorResponse = {
  error?: { message?: string };
};

type AddClinicBranchProps = {
  clinicId: string;
  clinicName: string;
  hasBranches: boolean;
};

const inputClassName =
  'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100';

function optionalValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export default function AddClinicBranch({
  clinicId,
  clinicName,
  hasBranches,
}: AddClinicBranchProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<BranchDraft | null>(null);
  const [formDefaults, setFormDefaults] = useState<BranchDraft | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        setIsOpen(false);
        setDraft(null);
        setFormDefaults(null);
        setError(null);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, isSubmitting]);

  function reviewBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    const nextDraft = {
      name: optionalValue(formData, 'name'),
      isMain: hasBranches ? formData.get('isMain') === 'on' : true,
      phone: optionalValue(formData, 'phone'),
      email: optionalValue(formData, 'email'),
      address: optionalValue(formData, 'address'),
      city: optionalValue(formData, 'city'),
      province: optionalValue(formData, 'province'),
    };
    setFormDefaults(nextDraft);
    setDraft(nextDraft);
  }

  async function createBranch() {
    if (!draft) return;

    setIsSubmitting(true);
    setError(null);
    const response = await fetch(`/api/admin/clinics/${clinicId}/branches`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(draft),
    }).catch(() => null);

    if (!response) {
      setError('Unable to reach the server. Check that the API is running.');
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ErrorResponse;
      setError(payload.error?.message ?? 'The branch could not be created.');
      setIsSubmitting(false);
      return;
    }

    setSuccess(`${draft.name} was added successfully.`);
    setIsSubmitting(false);
    setDraft(null);
    setFormDefaults(null);
    setIsOpen(false);
    formRef.current?.reset();
    router.refresh();
  }

  function closeDialog() {
    if (isSubmitting) return;
    setIsOpen(false);
    setDraft(null);
    setFormDefaults(null);
    setError(null);
  }

  return (
    <>
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <button
          type="button"
          onClick={() => {
            setSuccess(null);
            setIsOpen(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
        >
          <Plus size={17} /> Add branch
        </button>
        {success && (
          <p role="status" className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 size={14} /> {success}
          </p>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-branch-dialog-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-branch-dialog-title" className="text-lg font-bold text-slate-900">
                  {draft ? 'Confirm new branch' : 'Add clinic branch'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {draft
                    ? `Review the branch before adding it to ${clinicName}.`
                    : `Create a physical location for ${clinicName}.`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={isSubmitting}
                aria-label="Close branch form"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle size={17} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            {!draft ? (
              <form ref={formRef} onSubmit={reviewBranch} className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Branch name</span>
                    <input
                      name="name"
                      defaultValue={formDefaults?.name}
                      minLength={2}
                      maxLength={200}
                      placeholder="BGC Branch"
                      className={inputClassName}
                      autoFocus
                      required
                    />
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">Phone</span>
                    <input
                      name="phone"
                      defaultValue={formDefaults?.phone}
                      type="tel"
                      maxLength={20}
                      placeholder="+63 917 123 4567"
                      className={inputClassName}
                      autoComplete="tel"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">Email</span>
                    <input
                      name="email"
                      defaultValue={formDefaults?.email}
                      type="email"
                      maxLength={255}
                      placeholder="branch@example.ph"
                      className={inputClassName}
                      autoComplete="email"
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Address</span>
                    <input
                      name="address"
                      defaultValue={formDefaults?.address}
                      maxLength={500}
                      placeholder="123 High Street"
                      className={inputClassName}
                      autoComplete="street-address"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">City</span>
                    <input
                      name="city"
                      defaultValue={formDefaults?.city}
                      maxLength={100}
                      placeholder="Taguig"
                      className={inputClassName}
                      autoComplete="address-level2"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">Province</span>
                    <input
                      name="province"
                      defaultValue={formDefaults?.province}
                      maxLength={100}
                      placeholder="Metro Manila"
                      className={inputClassName}
                      autoComplete="address-level1"
                    />
                  </label>
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    name="isMain"
                    defaultChecked={formDefaults?.isMain ?? !hasBranches}
                    disabled={!hasBranches}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">Main branch</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {hasBranches
                        ? 'A clinic can have only one active main branch.'
                        : 'The first branch is automatically designated as the main branch.'}
                    </span>
                  </span>
                </label>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"
                  >
                    Review branch
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6">
                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
                  <div className="flex gap-3">
                    <MapPin size={20} className="mt-0.5 shrink-0 text-violet-600" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-violet-950">{draft.name}</p>
                        {draft.isMain && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                            Main
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-violet-700">
                        {[draft.address, draft.city, draft.province].filter(Boolean).join(', ') || 'No address provided'}
                      </p>
                      {(draft.phone || draft.email) && (
                        <p className="mt-2 text-xs text-violet-600">
                          {[draft.phone, draft.email].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  Confirming creates the branch immediately and records the action in the audit log.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      setDraft(null);
                      setError(null);
                    }}
                    disabled={isSubmitting}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void createBranch()}
                    disabled={isSubmitting}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {isSubmitting ? 'Adding branch…' : 'Confirm and add'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
