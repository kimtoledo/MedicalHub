'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, Loader2, MapPin, Stethoscope, UserRound } from 'lucide-react';

declare global {
  interface Window {
    grecaptcha?: { render: (container: HTMLElement, params: Record<string, unknown>) => number };
  }
}

export type BookingContext = {
  clinic: { name: string; slug: string };
  branches: Array<{ id: string; name: string; address: string | null; city: string | null; province: string | null }>;
  services: Array<{ id: string; name: string; durationMinutes: string }>;
  dentists: Array<{ id: string; firstName: string; lastName: string; specialty: string | null; branchIds: string[] }>;
};
type Slot = { startsAt: string; endsAt: string };
type Confirmation = { confirmationNumber: string; clinicName: string; branchName: string; serviceName: string; dentistName: string; startsAt: string; endsAt: string; status: 'pending' };

function tomorrowInManila() {
  const tomorrow = new Date(Date.now() + 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);
}
function displayTime(value: string) { return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
function displayDateTime(value: string) { return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'full', timeStyle: 'short' }).format(new Date(value)); }

export default function PublicBookingWizard({ contexts, fixedDentistId, initialClinicSlug, initialBranchId }: { contexts: BookingContext[]; fixedDentistId?: string; initialClinicSlug?: string; initialBranchId?: string }) {
  const firstContext = contexts.find((item) => item.clinic.slug === initialClinicSlug) ?? contexts[0];
  const initialBranch = firstContext?.branches.find((item) => item.id === initialBranchId)?.id ?? firstContext?.branches[0]?.id ?? '';
  const [step, setStep] = useState(1); const [clinicSlug, setClinicSlug] = useState(firstContext?.clinic.slug ?? ''); const [branchId, setBranchId] = useState(initialBranch);
  const [serviceId, setServiceId] = useState(firstContext?.services[0]?.id ?? ''); const [dentistId, setDentistId] = useState(fixedDentistId ?? ''); const [date, setDate] = useState(tomorrowInManila);
  const [slots, setSlots] = useState<Slot[]>([]); const [startsAt, setStartsAt] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const [recaptchaToken, setRecaptchaToken] = useState(''); const [agreedToTerms, setAgreedToTerms] = useState(false);
  const recaptchaContainer = useRef<HTMLDivElement>(null); const recaptchaWidgetId = useRef<number | null>(null);
  useEffect(() => {
    if (step !== 3 || !recaptchaSiteKey) return;
    const interval = setInterval(() => {
      if (!window.grecaptcha || !recaptchaContainer.current || recaptchaWidgetId.current !== null) return;
      recaptchaWidgetId.current = window.grecaptcha.render(recaptchaContainer.current, { sitekey: recaptchaSiteKey, callback: (token: string) => setRecaptchaToken(token), 'expired-callback': () => setRecaptchaToken('') });
      clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [step]);
  const context = contexts.find((item) => item.clinic.slug === clinicSlug) ?? firstContext;
  const dentists = useMemo(() => context?.dentists.filter((item) => item.branchIds.includes(branchId)) ?? [], [context, branchId]);
  const branch = context?.branches.find((item) => item.id === branchId); const service = context?.services.find((item) => item.id === serviceId);

  function changeClinic(value: string) { const next = contexts.find((item) => item.clinic.slug === value); setClinicSlug(value); setBranchId(next?.branches[0]?.id ?? ''); setServiceId(next?.services[0]?.id ?? ''); setStartsAt(''); setSlots([]); }
  async function loadAvailability() {
    if (!context || !branchId || !serviceId || !date) { setError('Please complete the clinic, branch, service, and date selections.'); return; }
    setLoading(true); setError(''); setStartsAt('');
    const query = new URLSearchParams({ branchId, serviceId, date }); if (fixedDentistId || dentistId) query.set('dentistId', fixedDentistId ?? dentistId);
    try { const response = await fetch(`/api/public/clinics/${encodeURIComponent(context.clinic.slug)}/availability?${query}`, { cache: 'no-store' }); const payload = await response.json() as { data?: { slots: Slot[] }; error?: { message?: string } }; if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? 'Could not load availability'); setSlots(payload.data.slots); setStep(2); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load availability'); } finally { setLoading(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!context || !startsAt) return;
    if (!agreedToTerms) { setError('Please agree to the terms before submitting.'); return; }
    if (recaptchaSiteKey && !recaptchaToken) { setError('Please complete the reCAPTCHA verification.'); return; }
    const data = new FormData(event.currentTarget); setLoading(true); setError('');
    const payload = { clinicSlug: context.clinic.slug, branchId, serviceId, dentistId: (fixedDentistId ?? dentistId) || undefined, date, startsAt, patientFirstName: String(data.get('patientFirstName') ?? ''), patientLastName: String(data.get('patientLastName') ?? ''), patientPhone: String(data.get('patientPhone') ?? ''), patientEmail: String(data.get('patientEmail') ?? ''), chiefComplaint: String(data.get('chiefComplaint') ?? ''), agreedToTerms: true, recaptchaToken };
    try { const response = await fetch('/api/public/appointments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json() as { data?: Confirmation; error?: { message?: string } }; if (!response.ok || !result.data) throw new Error(result.error?.message ?? 'Booking could not be completed'); setConfirmation(result.data); setStep(4); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Booking could not be completed'); } finally { setLoading(false); }
  }
  if (!context) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">No bookable clinic affiliation is currently available.</div>;
  if (confirmation) return <section className="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10" aria-live="polite"><CheckCircle2 className="mx-auto text-emerald-500" size={56} /><p className="mt-5 text-sm font-bold uppercase tracking-wider text-emerald-700">Appointment request received</p><h2 className="mt-2 text-3xl font-extrabold text-slate-900">Thank you for booking</h2><p className="mx-auto mt-3 max-w-xl text-slate-600">The clinic will review your pending appointment. Keep this confirmation number for reference.</p><div className="mx-auto mt-6 max-w-md rounded-2xl bg-violet-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Confirmation number</p><p className="mt-1 break-all text-2xl font-extrabold text-violet-900">{confirmation.confirmationNumber}</p></div><dl className="mx-auto mt-7 grid max-w-xl gap-3 text-left text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Clinic</dt><dd className="font-semibold text-slate-900">{confirmation.clinicName} · {confirmation.branchName}</dd></div><div><dt className="text-slate-500">Dentist</dt><dd className="font-semibold text-slate-900">{confirmation.dentistName}</dd></div><div><dt className="text-slate-500">Service</dt><dd className="font-semibold text-slate-900">{confirmation.serviceName}</dd></div><div><dt className="text-slate-500">Schedule</dt><dd className="font-semibold text-slate-900">{displayDateTime(confirmation.startsAt)}</dd></div></dl></section>;

  return <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-8"><ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Booking progress">{['Visit details', 'Schedule', 'Your details'].map((label, index) => <li key={label} className={`rounded-full px-3 py-2 text-center text-xs font-bold ${step === index + 1 ? 'bg-violet-600 text-white' : step > index + 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{index + 1}. {label}</li>)}</ol>
    {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {step === 1 && <div><h2 className="text-2xl font-bold text-slate-900">Choose your visit</h2><div className="mt-6 grid gap-5 sm:grid-cols-2">{contexts.length > 1 && <label className="text-sm font-semibold text-slate-700">Clinic<select value={clinicSlug} onChange={(event) => changeClinic(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal">{contexts.map((item) => <option key={item.clinic.slug} value={item.clinic.slug}>{item.clinic.name}</option>)}</select></label>}<label className="text-sm font-semibold text-slate-700">Branch<select value={branchId} onChange={(event) => { setBranchId(event.target.value); setDentistId(fixedDentistId ?? ''); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal">{context.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{branch && <span className="mt-2 flex items-start gap-1 text-xs font-normal text-slate-500"><MapPin size={13} />{[branch.address, branch.city, branch.province].filter(Boolean).join(', ')}</span>}</label><label className="text-sm font-semibold text-slate-700">Service<select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal">{context.services.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.durationMinutes} min)</option>)}</select></label>{fixedDentistId ? <div className="rounded-xl bg-violet-50 p-4 text-sm"><span className="font-semibold text-violet-900">Dentist preselected</span><p className="mt-1 text-violet-700">{dentists.find((item) => item.id === fixedDentistId) ? `Dr. ${dentists.find((item) => item.id === fixedDentistId)?.firstName} ${dentists.find((item) => item.id === fixedDentistId)?.lastName}` : 'This dentist is not assigned to the selected branch.'}</p></div> : <label className="text-sm font-semibold text-slate-700">Dentist<select value={dentistId} onChange={(event) => setDentistId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal"><option value="">Any available dentist</option>{dentists.map((item) => <option key={item.id} value={item.id}>Dr. {item.firstName} {item.lastName}</option>)}</select></label>}<label className="text-sm font-semibold text-slate-700">Preferred date<input type="date" min={tomorrowInManila()} value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" /></label></div><button type="button" disabled={loading || !branchId || !serviceId || (Boolean(fixedDentistId) && !dentists.some((item) => item.id === fixedDentistId))} onClick={loadAvailability} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={18} /> : <CalendarDays size={18} />}Check available times <ArrowRight size={17} /></button></div>}
    {step === 2 && <div><button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700"><ArrowLeft size={16} />Change visit details</button><h2 className="mt-4 text-2xl font-bold text-slate-900">Choose an available time</h2><p className="mt-2 text-sm text-slate-500">{service?.name} at {branch?.name} · times shown in Philippine Time</p>{slots.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{slots.map((slot) => <button type="button" key={slot.startsAt} onClick={() => setStartsAt(slot.startsAt)} className={`rounded-xl border px-3 py-3 text-sm font-bold ${startsAt === slot.startsAt ? 'border-violet-600 bg-violet-600 text-white' : 'border-violet-200 text-violet-700 hover:bg-violet-50'}`}><Clock3 className="mx-auto mb-1" size={16} />{displayTime(slot.startsAt)}</button>)}</div> : <div className="mt-6 rounded-xl bg-amber-50 p-5 text-sm text-amber-800">No open slots remain for this date. Please choose another date.</div>}<button type="button" disabled={!startsAt} onClick={() => setStep(3)} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white disabled:opacity-50">Continue <ArrowRight size={17} /></button></div>}
    {step === 3 && <form onSubmit={submit}><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700"><ArrowLeft size={16} />Choose another time</button><h2 className="mt-4 text-2xl font-bold text-slate-900">Your contact details</h2><div className="mt-5 rounded-xl bg-violet-50 p-4 text-sm text-violet-900"><p className="flex items-center gap-2 font-semibold"><Stethoscope size={16} />{service?.name} · {branch?.name}</p><p className="mt-2 flex items-center gap-2"><Clock3 size={16} />{displayDateTime(startsAt)}</p></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">First name<input required name="patientFirstName" maxLength={100} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" /></label><label className="text-sm font-semibold text-slate-700">Last name<input required name="patientLastName" maxLength={100} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" /></label><label className="text-sm font-semibold text-slate-700">Contact number<input required name="patientPhone" type="tel" maxLength={20} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" /></label><label className="text-sm font-semibold text-slate-700">Email<input required name="patientEmail" type="email" maxLength={255} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" /></label><label className="text-sm font-semibold text-slate-700 sm:col-span-2">Reason for visit<textarea required name="chiefComplaint" minLength={2} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" /></label></div><p className="mt-4 text-xs text-slate-500">Submitting creates a pending request. The clinic may contact you to confirm the schedule.</p>
      <label className="mt-5 flex items-start gap-2 text-sm text-slate-600"><input required type="checkbox" checked={agreedToTerms} onChange={(event) => setAgreedToTerms(event.target.checked)} className="mt-1" />I agree to the terms of service and consent to the clinic contacting me to confirm this appointment.</label>
      {recaptchaSiteKey && <><Script src="https://www.google.com/recaptcha/api.js" strategy="lazyOnload" /><div ref={recaptchaContainer} className="mt-4" /></>}
      <button disabled={loading || !agreedToTerms || (Boolean(recaptchaSiteKey) && !recaptchaToken)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={18} /> : <UserRound size={18} />}Submit appointment request</button></form>}
  </section>;
}
