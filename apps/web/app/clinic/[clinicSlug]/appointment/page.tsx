import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react';
import { brandingImageUrl } from '@/lib/clinic-branding';
import PublicBookingWizard, { type BookingContext } from '@/components/public/PublicBookingWizard';
import { getPublicClinic } from '@/lib/public-directory';

type Props = { params: Promise<{ clinicSlug: string }>; searchParams: Promise<{ branch?: string; dentist?: string }> };
export const metadata: Metadata = { title: 'Book an Appointment', description: 'Request a dental appointment through Dentra.ph.' };
export default async function ClinicAppointmentPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const clinic = await getPublicClinic(params.clinicSlug).catch(() => null);if (!clinic) notFound();
  const context: BookingContext = { clinic: { name: clinic.name, slug: clinic.slug }, branches: clinic.branches.map(({ id, name, address, city, province }) => ({ id, name, address, city, province })), services: clinic.services.map(({ id, name, durationMinutes }) => ({ id, name, durationMinutes })), dentists: clinic.dentists.map(({ id, firstName, lastName, specialty, branchIds }) => ({ id, firstName, lastName, specialty, branchIds })) };
  const logoSrc = brandingImageUrl(clinic.id, 'logo', clinic.logoUpdatedAt, clinic.logoUrl);
  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <Link href={`/clinic/${clinic.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition-colors hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2">
            <ArrowLeft size={16} className="shrink-0" aria-hidden="true" />
            Back to {clinic.name}
          </Link>
          <span className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:inline-flex"><UserRound size={15} aria-hidden="true" />No account needed</span>
        </div>
        <div className="mb-8 mt-6 flex flex-col justify-between gap-5 sm:mb-10 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-violet-100 bg-white text-sm font-bold text-violet-700 shadow-sm">
                {logoSrc ? <img src={logoSrc} alt={`${clinic.name} logo`} className="h-full w-full object-contain" /> : <span aria-hidden="true">{clinic.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</span>}
              </div>
              <p className="text-sm font-semibold text-violet-900">{clinic.name}</p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Book your appointment<span className="text-violet-600">.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">A little planning for a healthier smile. Choose your visit details and find a time that works for you.</p>
          </div>
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-white text-violet-500 lg:flex" aria-hidden="true"><CalendarDays size={28} strokeWidth={1.5} /></div>
        </div>
        <PublicBookingWizard contexts={[context]} initialBranchId={searchParams.branch} fixedDentistId={searchParams.dentist} showVisitSummary />
      </div>
    </main>
  );
}
