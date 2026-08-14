'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Pencil, X } from 'lucide-react';

type ErrorResponse = {
  error?: { message?: string };
};

export type ClinicAccountInfoCurrent = {
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
};

type ClinicAccountInfoActionProps = {
  clinicId: string;
  clinicName: string;
  publicationStatus: 'draft' | 'published' | 'unpublished';
  current: ClinicAccountInfoCurrent;
};

const field = 'mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm';
const label = 'block text-sm font-semibold text-slate-700';

export default function ClinicAccountInfoAction({
  clinicId,
  clinicName,
  publicationStatus,
  current,
}: ClinicAccountInfoActionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slugLocked = publicationStatus !== 'draft';

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, isSubmitting]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, string | undefined> = {
      name: String(form.get('name') || ''),
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || ''),
      address: String(form.get('address') || ''),
      city: String(form.get('city') || ''),
      province: String(form.get('province') || ''),
      website: String(form.get('website') || ''),
      description: String(form.get('description') || ''),
      logoUrl: String(form.get('logoUrl') || ''),
    };
    if (!slugLocked) {
      payload.slug = String(form.get('slug') || '');
    }

    const response = await fetch(`/api/admin/clinics/${clinicId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!response) {
      setError('Unable to reach the server. Check that the API is running.');
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ErrorResponse;
      setError(body.error?.message ?? 'The clinic account info could not be saved.');
      setIsSubmitting(false);
      return;
    }

    setIsOpen(false);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Pencil size={13} /> Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clinic-account-info-dialog-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="clinic-account-info-dialog-title" className="text-lg font-bold text-slate-900">
                Edit {clinicName}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className={label}>
                Name
                <input name="name" defaultValue={current.name} required className={field} />
              </label>
              <label className={label}>
                Slug
                <input
                  name="slug"
                  defaultValue={current.slug}
                  disabled={slugLocked}
                  className={`${field} ${slugLocked ? 'bg-slate-50 text-slate-400' : ''}`}
                />
                {slugLocked && (
                  <span className="mt-1 block text-xs text-slate-500">
                    The slug cannot change once the microsite has been published.
                  </span>
                )}
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  Contact email
                  <input name="email" type="email" defaultValue={current.email ?? ''} className={field} />
                </label>
                <label className={label}>
                  Contact phone
                  <input name="phone" defaultValue={current.phone ?? ''} className={field} />
                </label>
              </div>
              <label className={label}>
                Address
                <input name="address" defaultValue={current.address ?? ''} className={field} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  City
                  <input name="city" defaultValue={current.city ?? ''} className={field} />
                </label>
                <label className={label}>
                  Province
                  <input name="province" defaultValue={current.province ?? ''} className={field} />
                </label>
              </div>
              <label className={label}>
                Website
                <input name="website" type="url" defaultValue={current.website ?? ''} placeholder="https://" className={field} />
              </label>
              <label className={label}>
                Logo URL
                <input name="logoUrl" type="url" defaultValue={current.logoUrl ?? ''} placeholder="https://" className={field} />
              </label>
              <label className={label}>
                Description
                <textarea name="description" defaultValue={current.description ?? ''} rows={3} className={field} />
              </label>

              {error && (
                <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
