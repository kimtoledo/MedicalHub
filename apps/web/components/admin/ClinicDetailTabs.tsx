'use client';

import { useState } from 'react';
import {
  CalendarDays,
  Check,
  CircleSlash2,
  ExternalLink,
  Gauge,
  Info,
  LayoutDashboard,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react';
import type { AdminClinicDetail, AdminClinicPackageOption } from '@/lib/admin-clinics';
import ClinicAccountInfoAction from '@/components/admin/ClinicAccountInfoAction';
import AddClinicBranch from '@/components/admin/AddClinicBranch';
import ClinicPackageAction from '@/components/admin/ClinicPackageAction';
import FeatureOverrideManager from '@/components/admin/FeatureOverrideManager';
import LimitOverrideManager from '@/components/admin/LimitOverrideManager';
import ClinicDentistsTab from '@/components/admin/ClinicDentistsTab';
import ClinicMembersTab from '@/components/admin/ClinicMembersTab';
import ClinicPatientsTab from '@/components/admin/ClinicPatientsTab';

type Tab = 'overview' | 'account' | 'branches' | 'features' | 'capacity' | 'dentists' | 'users' | 'patients';

const TABS: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'account', label: 'Account Info', icon: Info },
  { id: 'branches', label: 'Branches', icon: MapPin },
  { id: 'features', label: 'Features', icon: ShieldCheck },
  { id: 'capacity', label: 'Capacity', icon: Gauge },
  { id: 'dentists', label: 'Dentists', icon: Stethoscope },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'patients', label: 'Patients', icon: UsersRound },
];

function formatDate(value: string | null): string {
  if (!value) return 'No expiry';
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(value));
}

function formatFeatureKey(value: string): string {
  return value
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}

function formatMetric(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function joinAddress(parts: Array<string | null>): string {
  return parts.filter(Boolean).join(', ') || 'Not provided';
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon size={20} className="text-violet-600" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate font-bold text-slate-900">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export default function ClinicDetailTabs({
  clinic,
  packageOptions,
}: {
  clinic: AdminClinicDetail;
  packageOptions: AdminClinicPackageOption[];
}) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-violet-50 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              tab === id ? 'bg-white text-violet-900 shadow-sm' : 'text-violet-500 hover:text-violet-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              icon={Package}
              label="Package"
              value={clinic.subscription?.package.name ?? 'Unassigned'}
              detail={clinic.subscription?.status ?? 'No subscription'}
            />
            <StatCard
              icon={UserRound}
              label="Clinic owner"
              value={clinic.owner?.name || clinic.owner?.email || 'Unassigned'}
              detail={clinic.owner?.email ?? 'No owner membership'}
            />
            <StatCard
              icon={MapPin}
              label="Branches"
              value={String(clinic.branches.length)}
              detail={`${clinic.branches.filter((branch) => branch.isActive).length} active`}
            />
            <StatCard icon={Stethoscope} label="Dentists" value={String(clinic.dentistCount)} detail="Affiliated" />
            <StatCard icon={Users} label="Staff" value={String(clinic.staffCount)} detail="Active members" />
            <StatCard icon={UsersRound} label="Patients" value={String(clinic.patientCount)} detail="Registered" />
          </div>

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
                <ClinicPackageAction
                  clinicId={clinic.id}
                  clinicName={clinic.name}
                  currentPackageId={clinic.subscription.package.id}
                  packages={packageOptions}
                />
              </div>
            ) : (
              <div>
                <p className="mt-4 text-sm text-slate-500">No package is currently assigned.</p>
                <ClinicPackageAction clinicId={clinic.id} clinicName={clinic.name} currentPackageId={null} packages={packageOptions} />
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'account' && (
        <section>
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-bold text-slate-900">Account information</h2>
            <ClinicAccountInfoAction
              clinicId={clinic.id}
              clinicName={clinic.name}
              publicationStatus={clinic.publicationStatus}
              current={{
                name: clinic.name,
                slug: clinic.slug,
                email: clinic.email,
                phone: clinic.phone,
                address: clinic.address,
                city: clinic.city,
                province: clinic.province,
                website: clinic.website,
                description: clinic.description,
                logoUrl: clinic.logoUrl,
              }}
            />
          </div>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            {clinic.logoUrl && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Logo</dt>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clinic.logoUrl} alt={`${clinic.name} logo`} className="mt-2 h-12 w-12 rounded-xl border border-slate-200 object-contain" />
              </div>
            )}
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
              <dd className="mt-1 text-sm text-slate-800">{joinAddress([clinic.address, clinic.city, clinic.province])}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</dt>
              <dd className="mt-1 text-sm leading-6 text-slate-700">{clinic.description ?? 'No clinic description yet.'}</dd>
            </div>
            {clinic.website && (
              <div className="sm:col-span-2">
                <a href={clinic.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700">
                  Visit clinic website <ExternalLink size={15} />
                </a>
              </div>
            )}
          </dl>
        </section>
      )}

      {tab === 'branches' && (
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Branches</h2>
              <p className="mt-1 text-sm text-slate-500">Operational locations associated with this tenant.</p>
            </div>
            <AddClinicBranch clinicId={clinic.id} clinicName={clinic.name} hasBranches={clinic.branches.length > 0} />
          </div>
          {clinic.branches.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">No branches have been added yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {clinic.branches.map((branch) => (
                <div key={branch.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
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
                    {branch.email && <p className="inline-flex items-center gap-2 sm:flex"><Mail size={14} /> {branch.email}</p>}
                    {branch.phone && <p className="inline-flex items-center gap-2 sm:flex"><Phone size={14} /> {branch.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'features' && (
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

          <FeatureOverrideManager clinicId={clinic.id} availableFeatureKeys={clinic.availableFeatureKeys} overrides={clinic.featureOverrides} />
        </div>
      )}

      {tab === 'capacity' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Gauge size={19} className="text-violet-600" />
                <h2 className="font-bold text-slate-900">Effective capacity</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">Current usage against the resolved limit (override, else the package default).</p>
            </div>
            {clinic.capacity.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No capacity metrics are configured.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {clinic.capacity.map((item) => {
                  const overCap = item.limit !== null && item.used > item.limit;
                  const atCap = item.limit !== null && item.used >= item.limit;
                  return (
                    <div key={item.metric} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-800">{formatMetric(item.metric)}</p>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-sm ${overCap ? 'font-bold text-red-600' : atCap ? 'font-semibold text-amber-600' : 'text-slate-600'}`}>
                          {item.used} / {item.limit === null ? '∞' : item.limit}
                        </span>
                        {overCap && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Over cap</span>}
                        {!overCap && atCap && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">At cap</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <LimitOverrideManager clinicId={clinic.id} availableMetrics={clinic.availableCapacityMetrics} overrides={clinic.limitOverrides} />
        </div>
      )}

      {tab === 'dentists' && <ClinicDentistsTab clinicId={clinic.id} />}
      {tab === 'users' && <ClinicMembersTab clinicId={clinic.id} branches={clinic.branches} />}
      {tab === 'patients' && <ClinicPatientsTab clinicId={clinic.id} />}
    </div>
  );
}
