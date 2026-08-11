import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PublicBookingWizard, { type BookingContext } from '@/components/public/PublicBookingWizard';
import { getPublicClinic, getPublicDentist } from '@/lib/public-directory';

type Props = { params: { dentistSlug: string }; searchParams: { clinic?: string; branch?: string } };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const dentist = await getPublicDentist(params.dentistSlug).catch(() => null); return dentist ? { title: `Book with Dr. ${dentist.firstName} ${dentist.lastName}`, description: `Request a dental appointment with Dr. ${dentist.firstName} ${dentist.lastName}.` } : { title: 'Dentist Not Found', robots: { index: false } }; }
export default async function DentistAppointmentPage({ params, searchParams }: Props) {
  const dentist = await getPublicDentist(params.dentistSlug).catch(() => null); if (!dentist) notFound();
  const slugs = Array.from(new Set(dentist.affiliations.map((item) => item.clinicSlug)));
  const clinics = (await Promise.all(slugs.map((slug) => getPublicClinic(slug).catch(() => null)))).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const contexts: BookingContext[] = clinics.map((clinic) => ({ clinic: { name: clinic.name, slug: clinic.slug }, branches: clinic.branches.filter((branch) => dentist.affiliations.some((item) => item.clinicSlug === clinic.slug && item.branchId === branch.id)).map(({ id, name, address, city, province }) => ({ id, name, address, city, province })), services: clinic.services.map(({ id, name, durationMinutes }) => ({ id, name, durationMinutes })), dentists: clinic.dentists.map(({ id, firstName, lastName, specialty, branchIds }) => ({ id, firstName, lastName, specialty, branchIds })) }));
  return <><Navbar /><main className="min-h-screen bg-[#f8f7ff] px-4 py-12 sm:px-6"><div className="mx-auto max-w-4xl"><p className="text-sm font-bold uppercase tracking-wider text-violet-600">Dentist appointment request</p><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Book with Dr. {dentist.firstName} {dentist.lastName}</h1><p className="mt-3 max-w-2xl text-slate-600">Select one of the dentist&apos;s active clinic affiliations, then choose a live available schedule.</p><div className="mt-8"><PublicBookingWizard contexts={contexts} fixedDentistId={dentist.id} initialClinicSlug={searchParams.clinic} initialBranchId={searchParams.branch} /></div></div></main><Footer /></>;
}
