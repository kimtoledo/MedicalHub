'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ShieldCheck, Stethoscope } from 'lucide-react';

type ClinicDentist = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  publicationStatus: string;
  branchNames: string[];
};

type ErrorResponse = { error?: { message?: string } };

export default function ClinicDentistsTab({ clinicId }: { clinicId: string }) {
  const [items, setItems] = useState<ClinicDentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/clinics/${clinicId}/dentists`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { success: boolean; data?: ClinicDentist[]; error?: { message?: string } };
        if (!response.ok || !payload.success) {
          throw new Error((payload as ErrorResponse).error?.message ?? 'Dentists are unavailable');
        }
        setItems(payload.data ?? []);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : 'Dentists are unavailable');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [clinicId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Loading dentists…
      </div>
    );
  }

  if (error) {
    return <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</div>;
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Stethoscope size={30} className="text-slate-200" />
        <p className="text-sm font-medium text-slate-500">No dentists affiliated with this clinic</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((dentist) => (
        <Link
          key={dentist.id}
          href={`/dentra-admin/dentists/${dentist.id}`}
          className="flex flex-col gap-2 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              Dr. {dentist.firstName} {dentist.lastName}
              {dentist.verificationStatus === 'verified' && <ShieldCheck size={14} className="text-emerald-600" />}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {dentist.slug} · {dentist.branchNames.join(', ')}
            </p>
          </div>
          <span className="w-fit rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold capitalize text-violet-700">
            {dentist.publicationStatus}
          </span>
        </Link>
      ))}
    </div>
  );
}
