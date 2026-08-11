'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, EyeOff, Globe2, Loader2, X } from 'lucide-react';

type Props = {
  clinicId: string;
  clinicName: string;
  publicationStatus: 'draft' | 'published' | 'unpublished';
};

type ErrorResponse = { error?: { message?: string } };

export default function ClinicPublicationAction({
  clinicId,
  clinicName,
  publicationStatus,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPublished = publicationStatus === 'published';
  const nextStatus = isPublished ? 'unpublished' : 'published';
  const label = isPublished ? 'Unpublish' : 'Publish';
  const Icon = isPublished ? EyeOff : Globe2;

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) setIsOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isOpen, isSubmitting]);

  async function updatePublication() {
    setIsSubmitting(true);
    setError(null);
    const response = await fetch(`/api/admin/clinics/${clinicId}/publication`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publicationStatus: nextStatus }),
    }).catch(() => null);

    if (!response) {
      setError('Unable to reach the server. Check that the API is running.');
      setIsSubmitting(false);
      return;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ErrorResponse;
      setError(payload.error?.message ?? 'The microsite status could not be updated.');
      setIsSubmitting(false);
      return;
    }

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
          setIsOpen(true);
        }}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
      >
        <Icon size={17} /> {label} microsite
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="publication-dialog-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="publication-dialog-title" className="text-lg font-bold text-slate-900">
                  {label} {clinicName} microsite?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isPublished
                    ? 'The public clinic page will no longer be visible.'
                    : 'The clinic page will become publicly visible. Publishing requires the microsite entitlement.'}
                  {' '}This action is recorded in the audit log.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                aria-label="Close publication confirmation"
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
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void updatePublication()}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-violet-300"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Updating…' : `Confirm ${label.toLowerCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
