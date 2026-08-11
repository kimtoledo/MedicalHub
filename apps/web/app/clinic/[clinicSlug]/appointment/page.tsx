import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PublicBookingWizard, { type BookingContext } from '@/components/public/PublicBookingWizard';
import { getPublicClinic } from '@/lib/public-directory';

type Props = { params: { clinicSlug: string }; searchParams: { branch?: string; dentist?: string } };
export const metadata: Metadata = { title: 'Book an Appointment', description: 'Request a dental appointment through Dentra.ph.' };
export default async function ClinicAppointmentPage({ params, searchParams }: Props) {
  const clinic = await getPublicClinic(params.clinicSlug).catch(() => null); if (!clinic) notFound();
  const context: BookingContext = { clinic: { name: clinic.name, slug: clinic.slug }, branches: clinic.branches.map(({ id, name, address, city, province }) => ({ id, name, address, city, province })), services: clinic.services.map(({ id, name, durationMinutes }) => ({ id, name, durationMinutes })), dentists: clinic.dentists.map(({ id, firstName, lastName, specialty, branchIds }) => ({ id, firstName, lastName, specialty, branchIds })) };
  return <><Navbar /><main className="min-h-screen bg-[#f8f7ff] px-4 py-12 sm:px-6"><div className="mx-auto max-w-4xl"><p className="text-sm font-bold uppercase tracking-wider text-violet-600">Online appointment request</p><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Book at {clinic.name}</h1><p className="mt-3 max-w-2xl text-slate-600">Choose an open schedule and send your request directly to the clinic. No patient account is required.</p><div className="mt-8"><PublicBookingWizard contexts={[context]} initialBranchId={searchParams.branch} fixedDentistId={searchParams.dentist} /></div></div></main><Footer /></>;
}
