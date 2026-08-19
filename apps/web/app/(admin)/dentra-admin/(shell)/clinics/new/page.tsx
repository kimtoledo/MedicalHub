import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import CreateClinicForm from '@/components/admin/CreateClinicForm';
import { getAdminClinicPackageOptions } from '@/lib/admin-clinics';

export default async function NewClinicPage() {
  let packages;
  try {
    packages = await getAdminClinicPackageOptions();
  } catch {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="font-semibold">Unable to start clinic onboarding</h1>
          <p className="mt-1 text-sm text-red-700">
            Active package options could not be loaded. Check that the API is running
            and try again.
          </p>
          <Link
            href="/dentra-admin/clinics"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-800 underline"
          >
            <ArrowLeft size={16} /> Back to clinics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/dentra-admin/clinics"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-violet-700"
          >
            <ArrowLeft size={16} /> Back to clinics
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
              <Building2 size={22} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create clinic</h1>
              <p className="text-sm text-slate-500">
                Set up the tenant, owner, and initial subscription.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <CreateClinicForm packages={packages} />
        </div>
      </div>
    </div>
  );
}
