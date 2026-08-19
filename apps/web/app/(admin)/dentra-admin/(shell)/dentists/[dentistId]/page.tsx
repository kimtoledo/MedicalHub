import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { getAdminDentistDetail } from '@/lib/admin-dentists';
import DentistAffiliationManager from '@/components/admin/DentistAffiliationManager';
import DentistProfileActions from '@/components/admin/DentistProfileActions';

type DentistDetailPageProps = {
  params: { dentistId: string };
  searchParams?: { created?: string };
};

export default async function DentistDetailPage({ params, searchParams }: DentistDetailPageProps) {
  const wasCreated = searchParams?.created === '1';
  let dentist;
  try {
    dentist = await getAdminDentistDetail(params.dentistId);
  } catch {
    return (
      <div className="p-6 sm:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h2 className="font-semibold">Unable to load dentist</h2>
          <p className="mt-1 text-sm">Check that the API is running and refresh this page.</p>
        </div>
      </div>
    );
  }
  if (!dentist) notFound();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/dentra-admin/dentists" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-violet-700">
          <ArrowLeft size={16} /> Back to dentists
        </Link>

        {wasCreated && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0" />
            Dentist profile created as an unverified private draft.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-xl font-bold text-violet-700">
                {dentist.firstName[0]}{dentist.lastName[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Dr. {dentist.firstName} {dentist.lastName}</h1>
                <p className="mt-1 text-sm text-slate-500">{dentist.specialty ?? 'General dentistry'} · {dentist.slug}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold capitalize text-emerald-700 ring-1 ring-emerald-600/20">
                  {dentist.verificationStatus === 'verified' && <ShieldCheck size={14} />}{dentist.verificationStatus}
                </span>
                <span className="rounded-full bg-violet-50 px-3 py-2 text-xs font-semibold capitalize text-violet-700 ring-1 ring-violet-600/20">{dentist.publicationStatus}</span>
              </div>
              <DentistProfileActions dentistId={dentist.id} verificationStatus={dentist.verificationStatus} publicationStatus={dentist.publicationStatus} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Stethoscope size={18} className="text-violet-600" /> Professional profile</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">PRC license</dt><dd className="mt-1 text-sm text-slate-800">{dentist.licenseNumber ?? 'Not provided'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Specialty</dt><dd className="mt-1 text-sm text-slate-800">{dentist.specialty ?? 'Not provided'}</dd></div>
              <div><dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400"><Mail size={12} /> Email</dt><dd className="mt-1 text-sm text-slate-800">{dentist.email ?? 'Not provided'}</dd></div>
              <div><dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400"><Phone size={12} /> Phone</dt><dd className="mt-1 text-sm text-slate-800">{dentist.phone ?? 'Not provided'}</dd></div>
              <div className="sm:col-span-2"><dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400"><FileText size={12} /> Biography</dt><dd className="mt-1 text-sm leading-6 text-slate-700">{dentist.bio ?? 'No biography provided.'}</dd></div>
            </dl>
          </section>

          <DentistAffiliationManager dentistId={dentist.id} affiliations={dentist.affiliations} availableBranches={dentist.availableBranches} />
        </div>
      </div>
    </div>
  );
}
