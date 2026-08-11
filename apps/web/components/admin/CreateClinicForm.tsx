'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Building2, Loader2, Save } from 'lucide-react';
import type { AdminClinicPackageOption } from '@/lib/admin-clinics';

type CreateClinicFormProps = {
  packages: AdminClinicPackageOption[];
};

type ErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
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

export default function CreateClinicForm({ packages }: CreateClinicFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/clinics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        slug: formData.get('slug'),
        prefix: formData.get('prefix'),
        ownerEmail: formData.get('ownerEmail'),
        packageId: formData.get('packageId'),
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
          'The clinic could not be created. Review the details and try again.',
      );
      setIsSubmitting(false);
      return;
    }

    router.push('/dentra-admin/clinics?created=1');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <label className="sm:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Clinic name</span>
          <input
            className={inputClassName}
            name="name"
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!slugEdited) setSlug(slugify(nextName));
            }}
            minLength={2}
            maxLength={200}
            placeholder="Pearl Dental Studio"
            autoComplete="organization"
            required
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-slate-700">URL slug</span>
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
            placeholder="pearl-dental-studio"
            required
          />
          <span className="mt-1 block text-xs text-slate-500">
            Public URL: dentra.ph/clinic/{slug || 'clinic-slug'}
          </span>
        </label>

        <label>
          <span className="text-sm font-semibold text-slate-700">Clinic prefix</span>
          <input
            className={inputClassName}
            name="prefix"
            value={prefix}
            onChange={(event) =>
              setPrefix(
                event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
              )
            }
            minLength={2}
            maxLength={8}
            pattern="[A-Z0-9]+"
            placeholder="PDS"
            required
          />
          <span className="mt-1 block text-xs text-slate-500">
            Used for patient and appointment reference numbers.
          </span>
        </label>

        <label>
          <span className="text-sm font-semibold text-slate-700">Owner email</span>
          <input
            className={inputClassName}
            type="email"
            name="ownerEmail"
            maxLength={255}
            placeholder="owner@clinic.ph"
            autoComplete="email"
            required
          />
          <span className="mt-1 block text-xs text-slate-500">
            Creates or links a pending Clinic Owner membership.
          </span>
        </label>

        <label>
          <span className="text-sm font-semibold text-slate-700">Initial package</span>
          <select
            className={inputClassName}
            name="packageId"
            defaultValue=""
            required
            disabled={packages.length === 0}
          >
            <option value="" disabled>
              {packages.length === 0 ? 'No active packages available' : 'Select a package'}
            </option>
            {packages.map((clinicPackage) => (
              <option key={clinicPackage.id} value={clinicPackage.id}>
                {clinicPackage.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            The clinic starts in trial status with this package.
          </span>
        </label>
      </div>

      <div className="rounded-2xl bg-violet-50 p-4">
        <div className="flex gap-3">
          <Building2 size={19} className="mt-0.5 shrink-0 text-violet-600" />
          <div>
            <p className="text-sm font-semibold text-violet-900">What happens next</p>
            <p className="mt-1 text-sm leading-6 text-violet-700">
              The clinic is created as a private draft in trial status. The owner is
              linked to the clinic, but invitation delivery and password setup remain
              a separate onboarding step.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push('/dentra-admin/clinics')}
          className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || packages.length === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
        >
          {isSubmitting ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}
          {isSubmitting ? 'Creating clinic…' : 'Create clinic'}
        </button>
      </div>
    </form>
  );
}
