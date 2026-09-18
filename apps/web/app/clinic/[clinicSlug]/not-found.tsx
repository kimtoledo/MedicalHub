import Link from 'next/link';

export default function ClinicPageNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-semibold text-violet-600">Page unavailable</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">We couldn’t find this clinic page</h1>
      <p className="mt-4 text-slate-600">The link may have changed, or the clinic page may no longer be published.</p>
      <Link href="/clinics" className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2">Browse clinics</Link>
    </main>
  );
}
