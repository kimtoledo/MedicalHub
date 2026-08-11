import { Package } from 'lucide-react';
import PackageManager from '@/components/admin/PackageManager';
import { getAdminPackages } from '@/lib/admin-packages';

export default async function PackagesPage() {
  let result;
  try { result = await getAdminPackages(); }
  catch {
    return <div className="p-6 sm:p-8"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"><h2 className="font-semibold">Unable to load packages</h2><p className="mt-1 text-sm">Check that the API is running and refresh this page.</p></div></div>;
  }
  return (
    <div className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100"><Package size={22} className="text-violet-600" /></div><div><h1 className="text-2xl font-bold text-slate-900">Packages & Plans</h1><p className="text-sm text-slate-500">Manage plan pricing labels and authoritative feature entitlements.</p></div></div>
      <PackageManager items={result.items} featureCatalog={result.featureCatalog} />
    </div></div>
  );
}
