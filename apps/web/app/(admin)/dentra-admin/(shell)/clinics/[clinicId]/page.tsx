import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  CircleSlash2,
  ExternalLink,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import {
  getAdminClinicDetail,
  type ClinicStatus,
} from '@/lib/admin-clinics';
import ClinicStatusActions from '@/components/admin/ClinicStatusActions';
import AddClinicBranch from '@/components/admin/AddClinicBranch';

type ClinicDetailPageProps = {
  params: { clinicId: string };
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

function formatFeatureKey(value: string): string {
  return value
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}

function joinAddress(parts: Array<string | null>): string {
  return parts.filter(Boolean).join(', ') || 'Not provided';
}

export default async function ClinicDetailPage({ params }: ClinicDetailPageProps) {
  let clinic;
  try {
    clinic = await getAdminClinicDetail(params.clinicId);
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
        <div>
          <Link
            href="/dentra-admin/clinics"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-violet-700"
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
              <ClinicStatusActions
                clinicId={clinic.id}
                clinicName={clinic.name}
                status={clinic.status}
              />
              <div className="text-left text-xs text-slate-500 sm:text-right">
                <p>Created {formatDate(clinic.createdAt)}</p>
                <p className="mt-1">Updated {formatDate(clinic.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Package size={20} className="text-violet-600" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Package</p>
            <p className="mt-1 font-bold text-slate-900">
              {clinic.subscription?.package.name ?? 'Unassigned'}
            </p>
            <p className="mt-1 text-xs capitalize text-slate-500">
              {clinic.subscription?.status ?? 'No subscription'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <UserRound size={20} className="text-violet-600" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Clinic owner</p>
            <p className="mt-1 truncate font-bold text-slate-900">
              {clinic.owner?.name || clinic.owner?.email || 'Unassigned'}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {clinic.owner?.email ?? 'No owner membership'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <MapPin size={20} className="text-violet-600" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Branches</p>
            <p className="mt-1 font-bold text-slate-900">{clinic.branches.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              {clinic.branches.filter((branch) => branch.isActive).length} active
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="font-bold text-slate-900">Account information</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slug</dt>
                <dd className="mt-1 font-mono text-sm text-slate-800">{clinic.slug}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference prefix</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{clinic.prefix}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact email</dt>
                <dd className="mt-1 text-sm text-slate-800">{clinic.email ?? 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact phone</dt>
                <dd className="mt-1 text-sm text-slate-800">{clinic.phone ?? 'Not provided'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {joinAddress([clinic.address, clinic.city, clinic.province])}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-700">
                  {clinic.description ?? 'No clinic description yet.'}
                </dd>
              </div>
              {clinic.website && (
                <div className="sm:col-span-2">
                  <a
                    href={clinic.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700"
                  >
                    Visit clinic website <ExternalLink size={15} />
                  </a>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Subscription</h2>
            {clinic.subscription ? (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-lg font-bold text-slate-900">{clinic.subscription.package.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{clinic.subscription.package.description ?? 'No package description.'}</p>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-700">
                  <CalendarDays size={17} className="mt-0.5 text-slate-400" />
                  <div>
                    <p>Starts {formatDate(clinic.subscription.startsAt)}</p>
                    <p className="mt-1">Expires {formatDate(clinic.subscription.expiresAt)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No package is currently assigned.</p>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Branches</h2>
              <p className="mt-1 text-sm text-slate-500">Operational locations associated with this tenant.</p>
            </div>
            <AddClinicBranch
              clinicId={clinic.id}
              clinicName={clinic.name}
              hasBranches={clinic.branches.length > 0}
            />
          </div>
          {clinic.branches.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No branches have been added yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {clinic.branches.map((branch) => (
                <div key={branch.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{branch.name}</p>
                      {branch.isMain && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">Main</span>}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${branch.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{joinAddress([branch.address, branch.city, branch.province])}</p>
                  </div>
                  <div className="space-y-1 text-sm text-slate-500 sm:text-right">
                    {branch.email && <p className="inline-flex items-center gap-1.5 sm:flex"><Mail size={14} /> {branch.email}</p>}
                    {branch.phone && <p className="inline-flex items-center gap-1.5 sm:flex"><Phone size={14} /> {branch.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={19} className="text-violet-600" />
                <h2 className="font-bold text-slate-900">Effective entitlements</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">Package features after active overrides are applied.</p>
            </div>
            {clinic.effectiveEntitlements.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No feature entitlements are configured.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {clinic.effectiveEntitlements.map((feature) => (
                  <div key={feature.featureKey} className="flex items-start justify-between gap-4 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{formatFeatureKey(feature.featureKey)}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">{feature.featureKey}</p>
                      {feature.reason && <p className="mt-1 text-xs text-slate-500">{feature.reason}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${feature.source === 'override' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                        {feature.source}
                      </span>
                      {feature.isEnabled ? <Check size={18} className="text-emerald-600" /> : <CircleSlash2 size={18} className="text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Feature overrides</h2>
            <p className="mt-1 text-sm text-slate-500">Current unexpired exceptions.</p>
            {clinic.featureOverrides.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No active overrides.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {clinic.featureOverrides.map((override) => (
                  <div key={override.id} className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-violet-900">{formatFeatureKey(override.featureKey)}</p>
                      <span className={`text-xs font-bold ${override.isEnabled ? 'text-emerald-700' : 'text-red-600'}`}>
                        {override.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-violet-700">{override.reason}</p>
                    <p className="mt-2 text-xs text-violet-500">Expires: {formatDate(override.expiresAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
