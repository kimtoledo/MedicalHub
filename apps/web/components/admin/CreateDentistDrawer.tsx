'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';

type ErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type CreateDentistResponse = {
  success: boolean;
  data?: { id: string };
};

const inputClassName =
  'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default function CreateDentistDrawer() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) setIsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting]);

  function updateGeneratedSlug(nextFirstName: string, nextLastName: string) {
    if (!slugEdited) {
      setSlug(slugify(`dr-${nextFirstName}-${nextLastName}`));
    }
  }

  function closeDrawer() {
    if (!isSubmitting) {
      setIsOpen(false);
      setError(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/dentists', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        slug: formData.get('slug'),
        licenseNumber: formData.get('licenseNumber'),
        specialty: formData.get('specialty'),
      }),
    }).catch(() => null);

    if (!response) {
      setError('Unable to reach the server. Check that the API is running.');
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ErrorResponse;
      setError(
        payload.error?.message ??
          'The dentist could not be created. Review the details and try again.',
      );
      setIsSubmitting(false);
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as CreateDentistResponse;
    setIsOpen(false);
    if (payload.data?.id) {
      router.push(`/dentra-admin/dentists/${payload.data.id}?created=1`);
    } else {
      router.push('/dentra-admin/dentists?created=1');
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"
      >
        <Plus size={17} /> Add dentist
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close create dentist panel"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
            onClick={closeDrawer}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-dentist-title"
            className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-7">
              <div>
                <h2
                  id="create-dentist-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Create dentist profile
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add the dentist’s core professional information.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                disabled={isSubmitting}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
                {error && (
                  <div
                    role="alert"
                    className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  >
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-semibold text-slate-700">
                      First name
                    </span>
                    <input
                      className={inputClassName}
                      name="firstName"
                      value={firstName}
                      onChange={(event) => {
                        const nextFirstName = event.target.value;
                        setFirstName(nextFirstName);
                        updateGeneratedSlug(nextFirstName, lastName);
                      }}
                      minLength={1}
                      maxLength={100}
                      autoComplete="given-name"
                      placeholder="Maria"
                      autoFocus
                      required
                    />
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">
                      Last name
                    </span>
                    <input
                      className={inputClassName}
                      name="lastName"
                      value={lastName}
                      onChange={(event) => {
                        const nextLastName = event.target.value;
                        setLastName(nextLastName);
                        updateGeneratedSlug(firstName, nextLastName);
                      }}
                      minLength={1}
                      maxLength={100}
                      autoComplete="family-name"
                      placeholder="Reyes"
                      required
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Public profile slug
                    </span>
                    <input
                      className={inputClassName}
                      name="slug"
                      value={slug}
                      onChange={(event) => {
                        setSlugEdited(true);
                        setSlug(slugify(event.target.value));
                      }}
                      minLength={2}
                      maxLength={80}
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      placeholder="dr-maria-reyes"
                      required
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      Public URL: dentra.ph/dentists/{slug || 'dentist-slug'}
                    </span>
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">
                      PRC license number
                    </span>
                    <input
                      className={inputClassName}
                      name="licenseNumber"
                      required
                      minLength={3}
                      maxLength={50}
                      placeholder="PRC-DEN-2026-001234"
                    />
                    <span className="mt-1 block text-xs text-slate-500">Used to find and link one professional profile across clinics. It is never used as a password.</span>
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-700">
                      Specialty
                    </span>
                    <input
                      className={inputClassName}
                      name="specialty"
                      maxLength={200}
                      placeholder="General Dentistry"
                    />
                  </label>
                </div>

                <div className="rounded-2xl bg-violet-50 p-4">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-violet-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-violet-900">
                        Safe defaults
                      </p>
                      <p className="mt-1 text-sm leading-6 text-violet-700">
                        The profile starts unverified and remains a private draft.
                        Clinic affiliation and sign-in access are managed separately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
                >
                  {isSubmitting ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {isSubmitting ? 'Creating dentist…' : 'Create dentist'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
