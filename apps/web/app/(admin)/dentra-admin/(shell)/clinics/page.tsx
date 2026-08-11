import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Search,
} from 'lucide-react';
import {
  getAdminClinics,
  type ClinicStatus,
} from '@/lib/admin-clinics';

type ClinicsPageProps = {
  searchParams?: {
    search?: string | string[];
    status?: string | string[];
    page?: string | string[];
    created?: string | string[];
  };
};

const clinicStatuses: ClinicStatus[] = [
  'trial',
  'active',
  'suspended',
  'archived',
];

const statusStyles: Record<ClinicStatus, string> = {
  trial: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20',
  archived: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

function getString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function createPageHref(filters: {
  search: string;
  status?: ClinicStatus;
  page: number;
}): string {
  const query = new URLSearchParams();
  if (filters.search) query.set('search', filters.search);
  if (filters.status) query.set('status', filters.status);
  query.set('page', String(filters.page));
  return `/dentra-admin/clinics?${query.toString()}`;
}

export default async function ClinicsPage({ searchParams }: ClinicsPageProps) {
  const search = getString(searchParams?.search).trim().slice(0, 100);
  const statusValue = getString(searchParams?.status);
  const status = clinicStatuses.includes(statusValue as ClinicStatus)
    ? (statusValue as ClinicStatus)
    : undefined;
  const requestedPage = Number.parseInt(getString(searchParams?.page), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const wasCreated = getString(searchParams?.created) === '1';

  let result;
  try {
    result = await getAdminClinics({ search, status, page });
  } catch {
    return (
      <div className="p-6 sm:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h2 className="font-semibold">Unable to load clinics</h2>
          <p className="mt-1 text-sm text-red-700">
            Check that the API is running and try refreshing this page.
          </p>
        </div>
      </div>
    );
  }

  const { items, pagination } = result;
  const firstItem = pagination.total === 0
    ? 0
    : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
                <Building2 size={22} className="text-violet-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Clinics</h1>
                <p className="text-sm text-slate-500">
                  Search and review every clinic account on Dentra.ph.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{pagination.total}</span>{' '}
              total clinic{pagination.total === 1 ? '' : 's'}
            </div>
            <Link
              href="/dentra-admin/clinics/new"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <Plus size={17} /> Add clinic
            </Link>
          </div>
        </div>

        {wasCreated && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0" />
            Clinic created successfully with its owner and initial package.
          </div>
        )}

        <form
          action="/dentra-admin/clinics"
          method="get"
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_180px_auto]"
        >
          <label className="relative block">
            <span className="sr-only">Search clinics</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              name="search"
              defaultValue={search}
              maxLength={100}
              placeholder="Search name, slug, or prefix"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              name="status"
              defaultValue={status ?? ''}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
            >
              <option value="">All statuses</option>
              {clinicStatuses.map((clinicStatus) => (
                <option key={clinicStatus} value={clinicStatus}>
                  {clinicStatus.charAt(0).toUpperCase() + clinicStatus.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-11 flex-1 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 sm:flex-none"
            >
              Apply
            </button>
            {(search || status) && (
              <Link
                href="/dentra-admin/clinics"
                className="flex h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Clear
              </Link>
            )}
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {items.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Building2 size={25} className="text-slate-400" />
              </div>
              <h2 className="mt-4 font-semibold text-slate-800">No clinics found</h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Try a different search term or clear the current status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {['Clinic', 'Slug', 'Status', 'Package', 'Branches'].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((clinic) => (
                    <tr key={clinic.id} className="transition hover:bg-violet-50/40">
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-xs font-bold text-violet-700">
                            {clinic.prefix || clinic.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{clinic.name}</p>
                            <p className="text-xs capitalize text-slate-500">
                              {clinic.publicationStatus}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-sm text-slate-600">
                        {clinic.slug}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles[clinic.status]}`}
                        >
                          {clinic.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                        {clinic.packageName ?? 'Unassigned'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={15} className="text-slate-400" />
                          {clinic.branchCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{firstItem}</span>–
              <span className="font-medium text-slate-700">{lastItem}</span> of{' '}
              <span className="font-medium text-slate-700">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-2">
              {pagination.page > 1 ? (
                <Link
                  href={createPageHref({ search, status, page: pagination.page - 1 })}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ChevronLeft size={16} /> Previous
                </Link>
              ) : (
                <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-100 px-3 text-sm text-slate-300">
                  <ChevronLeft size={16} /> Previous
                </span>
              )}
              <span className="px-2 text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              {pagination.page < pagination.totalPages ? (
                <Link
                  href={createPageHref({ search, status, page: pagination.page + 1 })}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Next <ChevronRight size={16} />
                </Link>
              ) : (
                <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-100 px-3 text-sm text-slate-300">
                  Next <ChevronRight size={16} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
