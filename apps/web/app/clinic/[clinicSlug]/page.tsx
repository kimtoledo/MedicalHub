import type { Metadata } from 'next'; import Link from 'next/link'; import { notFound } from 'next/navigation'; import { ArrowRight, Building2, Clock3, ExternalLink, Facebook, Globe, Instagram, Mail, MapPin, Phone, Stethoscope } from 'lucide-react'; import Navbar from '@/components/Navbar'; import Footer from '@/components/Footer'; import PublicReviews from '@/components/public/PublicReviews'; import { getPublicClinic, getPublicReviewSummary, type PublicClinicDetail } from '@/lib/public-directory';
type Props = { params: { clinicSlug: string } };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const clinic = await getPublicClinic(params.clinicSlug).catch(() => null); if (!clinic) return { title: 'Clinic Not Found', robots: { index: false, follow: false } }; const description = clinic.description?.slice(0, 155) ?? `View ${clinic.name}'s services, dentists, branches, and appointment options on Dentra.ph.`; return { title: clinic.name, description, openGraph: { title: `${clinic.name} | Dentra.ph`, description, type: 'website', images: clinic.coverUrl ? [clinic.coverUrl] : undefined }, alternates: { canonical: `/clinic/${clinic.slug}` } }; }
const dayNames: Record<string, string> = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };
function parseHoursTo24h(label: string): { opens: string; closes: string } | null {
  if (/closed/i.test(label)) return null;
  const parts = label.replace(/[–—]/g, '-').trim().split(/\s*-\s*/);
  if (parts.length !== 2) return null;
  const parsePart = (part: string): string | null => {
    const match = part.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return null;
    let hour = Number(match[1]); const minute = match[2] ?? '00'; const period = match[3]?.toLowerCase();
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  };
  const opens = parsePart(parts[0]); const closes = parsePart(parts[1]);
  return opens && closes ? { opens, closes } : null;
}
function branchLocationQuery(branch: PublicClinicDetail['branches'][number]) {
  return [branch.address, branch.city, branch.province].filter(Boolean).join(', ');
}
// Prefers the clinic's own Google Maps link for the embed (appending output=embed
// so it renders inline instead of opening the full site), falling back to an
// address search. Shortened share links (goo.gl/maps.app.goo.gl) redirect before
// reaching google.com, so output=embed never reaches the real destination and
// Google blocks the frame — those fall back to the address query instead, while
// "Get directions" below still uses the original link since a plain link follows
// the redirect fine.
function branchMapEmbedSrc(branch: PublicClinicDetail['branches'][number]): string | null {
  if (branch.mapUrl) {
    try {
      const url = new URL(branch.mapUrl);
      if (/(^|\.)google\.[a-z.]+$/i.test(url.hostname)) {
        if (!url.searchParams.has('output')) url.searchParams.set('output', 'embed');
        return url.toString();
      }
    } catch {
      // Not a valid absolute URL — fall through to the address-based query below.
    }
  }
  const mapQuery = branchLocationQuery(branch);
  return mapQuery ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed` : null;
}
function clinicJsonLd(clinic: PublicClinicDetail, reviewSummary: { averageRating: number; total: number }) {
  const mainBranch = clinic.branches[0];
  const openingHoursSpecification = clinic.branches.flatMap((branch) => Object.entries(branch.operatingHours).map(([day, label]) => { const parsed = parseHoursTo24h(label); return parsed && dayNames[day] ? { '@type': 'OpeningHoursSpecification', dayOfWeek: dayNames[day], opens: parsed.opens, closes: parsed.closes } : null; }).filter((value): value is NonNullable<typeof value> => value !== null));
  return {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: clinic.name,
    description: clinic.description ?? undefined,
    image: clinic.logoUrl ?? undefined,
    url: `https://dentra.ph/clinic/${clinic.slug}`,
    telephone: clinic.phone ?? undefined,
    email: clinic.email ?? undefined,
    address: (clinic.address || clinic.city) ? { '@type': 'PostalAddress', streetAddress: clinic.address ?? undefined, addressLocality: clinic.city ?? undefined, addressRegion: clinic.province ?? undefined, addressCountry: 'PH' } : undefined,
    geo: mainBranch?.latitude && mainBranch?.longitude ? { '@type': 'GeoCoordinates', latitude: Number(mainBranch.latitude), longitude: Number(mainBranch.longitude) } : undefined,
    openingHoursSpecification: openingHoursSpecification.length ? openingHoursSpecification : undefined,
    aggregateRating: reviewSummary.total > 0 ? { '@type': 'AggregateRating', ratingValue: reviewSummary.averageRating.toFixed(1), reviewCount: reviewSummary.total } : undefined,
  };
}
export default async function ClinicMicrosite({ params }: Props) {
  const clinic = await getPublicClinic(params.clinicSlug).catch(() => null); if (!clinic) notFound();
  const reviewSummary = await getPublicReviewSummary({ clinicId: clinic.id }).catch(() => ({ averageRating: 0, total: 0 }));
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(clinicJsonLd(clinic, reviewSummary)).replace(/</g, '\\u003c') }} /><Navbar /><main className="bg-[#f8f7ff]"><section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-violet-800 to-violet-600 px-4 py-16 text-white sm:px-6 sm:py-24"><div className="absolute inset-0 opacity-10" style={clinic.coverUrl ? { backgroundImage: `url(${clinic.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} /><div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 sm:flex-row sm:items-center"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 text-2xl font-extrabold ring-1 ring-white/25">{clinic.logoUrl ? <img src={clinic.logoUrl} alt={`${clinic.name} logo`} className="h-full w-full object-cover" /> : clinic.name.slice(0, 2).toUpperCase()}</div><div><p className="text-sm font-semibold uppercase tracking-wider text-violet-200">Dentra.ph clinic</p><h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{clinic.name}</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-violet-100">{clinic.heroText ?? clinic.description ?? 'Professional dental care for healthier smiles.'}</p><Link href={`/clinic/${clinic.slug}/appointment`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-violet-700 shadow-lg hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-white">Book Appointment <ArrowRight size={18} /></Link></div></div></section>
 <section className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-6"><div className="grid gap-8 lg:grid-cols-[1fr_320px]"><article className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold text-slate-900">About the clinic</h2><p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{clinic.description ?? 'Learn more about this dental clinic by contacting the team.'}</p></article><aside className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm"><h2 className="font-bold text-slate-900">Contact</h2><ul className="mt-4 space-y-3 text-sm text-slate-600">{clinic.phone && <li><a href={`tel:${clinic.phone}`} className="flex items-center gap-2 hover:text-violet-700"><Phone size={16} />{clinic.phone}</a></li>}{clinic.email && <li><a href={`mailto:${clinic.email}`} className="flex items-center gap-2 hover:text-violet-700"><Mail size={16} />{clinic.email}</a></li>}{clinic.website && <li><a href={clinic.website} rel="noreferrer" target="_blank" className="flex items-center gap-2 hover:text-violet-700"><Globe size={16} />Website <ExternalLink size={12} /></a></li>}{clinic.mapUrl && <li><a href={clinic.mapUrl} rel="noreferrer" target="_blank" className="flex items-center gap-2 hover:text-violet-700"><MapPin size={16} />View map</a></li>}{clinic.facebookUrl && <li><a href={clinic.facebookUrl} rel="noreferrer" target="_blank" className="flex items-center gap-2 hover:text-violet-700"><Facebook size={16} />Facebook</a></li>}{clinic.instagramUrl && <li><a href={clinic.instagramUrl} rel="noreferrer" target="_blank" className="flex items-center gap-2 hover:text-violet-700"><Instagram size={16} />Instagram</a></li>}</ul></aside></div>
 <section><h2 className="text-2xl font-bold text-slate-900">Branches & hours</h2><div className="mt-5 grid gap-5 md:grid-cols-2">{clinic.branches.map((branch) => { const mapQuery = branchLocationQuery(branch); const mapEmbedSrc = branchMapEmbedSrc(branch); return <article key={branch.id} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 font-bold text-slate-900"><Building2 size={18} className="text-violet-600" />{branch.name}</h3><p className="mt-3 flex items-start gap-2 text-sm text-slate-600"><MapPin size={15} className="mt-0.5 shrink-0" />{mapQuery || 'Contact clinic for location details'}</p>{mapEmbedSrc && <div className="mt-3 overflow-hidden rounded-xl border border-violet-100"><iframe src={mapEmbedSrc} className="h-40 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`Map showing ${branch.name}`} /></div>}{(branch.mapUrl || mapQuery) && <a href={branch.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} rel="noreferrer" target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800">Get directions <ExternalLink size={11} /></a>}<div className="mt-4 border-t border-slate-100 pt-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Clock3 size={14} />Operating hours</p>{Object.keys(branch.operatingHours).length ? <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">{Object.entries(branch.operatingHours).map(([day, hours]) => <div key={day} className="contents"><dt className="text-slate-500">{dayNames[day] ?? day}</dt><dd className="text-right font-medium text-slate-700">{hours}</dd></div>)}</dl> : <p className="mt-2 text-xs text-slate-500">Contact the clinic for current hours.</p>}</div></article>; })}</div></section>
 <section><h2 className="text-2xl font-bold text-slate-900">Dental services</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{clinic.services.map((service) => <article key={service.id} className="rounded-2xl border border-violet-100 bg-white p-5"><Stethoscope className="text-violet-600" /><h3 className="mt-3 font-bold text-slate-900">{service.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{service.description ?? `${service.durationMinutes}-minute dental service.`}</p></article>)}</div></section>
 <section><h2 className="text-2xl font-bold text-slate-900">Meet the dentists</h2>{clinic.dentists.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{clinic.dentists.map((dentist) => <article key={dentist.id} className="rounded-2xl border border-violet-100 bg-white p-5"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 font-bold text-violet-700">{dentist.firstName[0]}{dentist.lastName[0]}</div><h3 className="mt-3 font-bold text-slate-900"><Link href={`/dentists/${dentist.slug}`} className="hover:text-violet-700">Dr. {dentist.firstName} {dentist.lastName}</Link></h3><p className="mt-1 text-sm text-violet-600">{dentist.specialty ?? 'General Dentistry'}</p><p className="mt-2 text-xs text-slate-500">{dentist.branches.join(' · ')}</p><Link href={`/clinic/${clinic.slug}/appointment?dentist=${encodeURIComponent(dentist.id)}`} className="mt-4 inline-flex text-sm font-semibold text-violet-700 hover:text-violet-900">Book with this dentist →</Link></article>)}</div> : <p className="mt-4 text-slate-500">Contact the clinic for its current dentist roster.</p>}</section>
 <PublicReviews clinicId={clinic.id} />
 <section className="rounded-3xl bg-violet-600 px-6 py-10 text-center text-white"><h2 className="text-3xl font-extrabold">Ready to book your visit?</h2><p className="mt-3 text-violet-100">Choose a branch, service, dentist, and available schedule online.</p><Link href={`/clinic/${clinic.slug}/appointment`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-violet-700">Book Appointment <ArrowRight size={18} /></Link></section>
 </section></main><Footer /></>;
}
