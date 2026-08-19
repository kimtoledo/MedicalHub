import Link from 'next/link';
import { ArrowLeft, Building2, CheckCircle2 } from 'lucide-react';
import {
  getAdminClinicDetail,
  getAdminClinicPackageOptions,
  type AdminClinicPackageOption,
  type ClinicStatus,
} from '@/lib/admin-clinics';
import ClinicStatusActions from '@/components/admin/ClinicStatusActions';
import ClinicPublicationAction from '@/components/admin/ClinicPublicationAction';
import ClinicDetailTabs from '@/components/admin/ClinicDetailTabs';

type ClinicDetailPageProps = {
  params: { clinicId: string };
  searchParams?: { created?: string };
};

const statusStyles: Record<ClinicStatus, string> = {
  trial: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20',
  archived: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

function formatDate(value: string | null): string {
  if (!value) return 'No expiry';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

export default async function ClinicDetailPage({ params, searchParams }: ClinicDetailPageProps) {
  const wasCreated = searchParams?.created === '1';
  let clinic;
  let packageOptions: AdminClinicPackageOption[] = [];
  try {
    [clinic, packageOptions] = await Promise.all([
      getAdminClinicDetail(params.clinicId),
      getAdminClinicPackageOptions().catch(() => []),
    ]);
  } catch {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="font-semibold">Unable to load clinic details</h1>
          <p className="mt-1 text-sm text-red-700">
            Check that the API is running and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Building2 size={30} className="mx-auto text-slate-400" />
          <h1 className="mt-3 text-lg font-bold text-slate-900">Clinic not found</h1>
          <p className="mt-1 text-sm text-slate-500">
            This clinic does not exist or is no longer available.
          </p>
          <Link
            href="/dentra-admin/clinics"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700"
          >
            <ArrowLeft size={16} /> Back to clinics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {wasCreated && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0" />
            Clinic created successfully with its owner and initial package.
          </div>
        )}
        <div>
          <Link
            href="/dentra-admin/clinics"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-violet-700"
          >
            <ArrowLeft size={16} /> Back to clinics
          </Link>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-sm font-bold text-violet-700">
                {clinic.prefix}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">{clinic.name}</h1>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles[clinic.status]}`}
                  >
                    {clinic.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  /clinic/{clinic.slug} · {clinic.publicationStatus}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <ClinicPublicationAction
                  clinicId={clinic.id}
                  clinicName={clinic.name}
                  publicationStatus={clinic.publicationStatus}
                />
                <ClinicStatusActions
                  clinicId={clinic.id}
                  clinicName={clinic.name}
                  status={clinic.status}
                />
              </div>
              <div className="text-left text-xs text-slate-500 sm:text-right">
                <p>Created {formatDate(clinic.createdAt)}</p>
                <p className="mt-1">Updated {formatDate(clinic.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        <ClinicDetailTabs clinic={clinic} packageOptions={packageOptions} />
      </div>
    </div>
  );
}
