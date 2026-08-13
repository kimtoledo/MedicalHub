import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Building2, MapPin, Stethoscope } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PublicReviews from '@/components/public/PublicReviews';
import { getPublicDentist, getPublicReviewSummary, type PublicDentistDetail } from '@/lib/public-directory';

type Props = { params: { dentistSlug: string } };

function dentistJsonLd(dentist: PublicDentistDetail, reviewSummary: { averageRating: number; total: number }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: `Dr. ${dentist.firstName} ${dentist.lastName}`,
    jobTitle: dentist.specialty ? `Dentist — ${dentist.specialty}` : 'Dentist',
    description: dentist.bio ?? undefined,
    image: dentist.photoUrl ?? undefined,
    url: `https://dentra.ph/dentists/${dentist.slug}`,
    worksFor: dentist.affiliations.length ? dentist.affiliations.map((item) => ({ '@type': 'Dentist', name: item.clinicName, url: `https://dentra.ph/clinic/${item.clinicSlug}` })) : undefined,
    aggregateRating: reviewSummary.total > 0 ? { '@type': 'AggregateRating', ratingValue: reviewSummary.averageRating.toFixed(1), reviewCount: reviewSummary.total } : undefined,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dentist = await getPublicDentist(params.dentistSlug).catch(() => null);
  if (!dentist) return { title: 'Dentist Not Found', robots: { index: false, follow: false } };
  const name = `Dr. ${dentist.firstName} ${dentist.lastName}`;
  const description = dentist.bio?.slice(0, 155) ?? `View ${name}'s professional profile and clinic affiliations on Dentra.ph.`;
  return { title: name, description, openGraph: { title: `${name} | Dentra.ph`, description, type: 'profile', images: dentist.photoUrl ? [dentist.photoUrl] : undefined }, alternates: { canonical: `/dentists/${dentist.slug}` } };
}

export default async function DentistProfile({ params }: Props) {
  const dentist = await getPublicDentist(params.dentistSlug).catch(() => null);
  if (!dentist) notFound();
  const reviewSummary = await getPublicReviewSummary({ dentistId: dentist.id }).catch(() => ({ averageRating: 0, total: 0 }));
  const serviceTags = Array.from(new Set(dentist.affiliations.flatMap((item) => item.services)));
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dentistJsonLd(dentist, reviewSummary)).replace(/</g, '\\u003c') }} /><Navbar /><main className="min-h-screen bg-[#f8f7ff]">
    <section className="bg-gradient-to-br from-violet-950 via-violet-800 to-violet-600 px-4 py-16 text-white sm:px-6"><div className="mx-auto flex max-w-5xl flex-col items-start gap-6 sm:flex-row sm:items-center"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/15 text-3xl font-extrabold ring-1 ring-white/25">{dentist.photoUrl ? <img src={dentist.photoUrl} alt={`Dr. ${dentist.firstName} ${dentist.lastName}`} className="h-full w-full object-cover" /> : `${dentist.firstName[0]}${dentist.lastName[0]}`}</div><div><p className="font-semibold text-violet-200">Dentist profile</p><h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Dr. {dentist.firstName} {dentist.lastName}</h1><p className="mt-3 text-lg text-violet-100">{dentist.specialty ?? 'General Dentistry'}</p>{dentist.licenseNumber && <p className="mt-2 text-sm text-violet-200">PRC License: {dentist.licenseNumber}</p>}</div></div></section>
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6"><section className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold text-slate-900">Professional biography</h2><p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{dentist.bio ?? 'Contact an affiliated clinic to learn more about this dentist.'}</p>{serviceTags.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{serviceTags.map((service) => <span key={service} className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">{service}</span>)}</div>}</section>
      <section><h2 className="text-2xl font-bold text-slate-900">Clinic affiliations</h2><p className="mt-2 text-slate-500">Choose a published clinic location to view or book.</p>{dentist.affiliations.length ? <div className="mt-5 grid gap-5 md:grid-cols-2">{dentist.affiliations.map((item) => <article key={item.assignmentId} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100"><Building2 size={20} className="text-violet-600" /></div><div><h3 className="font-bold text-slate-900"><Link href={`/clinic/${item.clinicSlug}`} className="hover:text-violet-700">{item.clinicName}</Link></h3><p className="mt-1 text-sm font-medium text-violet-600">{item.branchName}</p></div></div><p className="mt-4 flex items-start gap-2 text-sm text-slate-600"><MapPin size={15} className="mt-0.5 shrink-0" />{[item.address, item.city, item.province].filter(Boolean).join(', ') || 'Contact clinic for location details'}</p><Link href={`/dentists/${dentist.slug}/appointment?clinic=${encodeURIComponent(item.clinicSlug)}&branch=${encodeURIComponent(item.branchId)}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Book at {item.clinicName} <ArrowRight size={16} /></Link></article>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center"><Stethoscope className="mx-auto text-slate-300" /><p className="mt-3 text-slate-500">No published clinic affiliations are currently available.</p></div>}</section>
      <PublicReviews dentistId={dentist.id} />
      {dentist.affiliations.length > 0 && <section className="rounded-3xl bg-violet-600 px-6 py-10 text-center text-white"><h2 className="text-3xl font-extrabold">Book a dental visit</h2><p className="mt-3 text-violet-100">Select a clinic location and continue with this dentist pre-selected.</p><Link href={`/dentists/${dentist.slug}/appointment`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-violet-700">Choose a location <ArrowRight size={18} /></Link></section>}
    </div>
  </main><Footer /></>;
}
