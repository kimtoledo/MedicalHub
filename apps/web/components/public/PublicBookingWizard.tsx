'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, Loader2, Mail, MapPin, Stethoscope, UserRound } from 'lucide-react';

declare global {
  interface Window {
    grecaptcha?: { render: (container: HTMLElement, params: Record<string, unknown>) => number; reset: (widgetId: number) => void };
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

const fieldClassName = 'mt-2 min-h-12 min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm font-normal text-slate-800 transition-colors hover:border-violet-300 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60';
const primaryButtonClassName = 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto';
const backButtonClassName = 'inline-flex min-h-10 items-center gap-1.5 rounded text-sm font-medium text-slate-500 transition-colors hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600';

function tomorrowInManila() {
  const tomorrow = new Date(Date.now() + 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);
}
function displayTime(value: string) { return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
function displayDateTime(value: string) { return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'full', timeStyle: 'short' }).format(new Date(value)); }

export default function PublicBookingWizard({ contexts, fixedDentistId, initialClinicSlug, initialBranchId, showVisitSummary = false }: { contexts: BookingContext[]; fixedDentistId?: string; initialClinicSlug?: string; initialBranchId?: string; showVisitSummary?: boolean }) {
  const firstContext = contexts.find((item) => item.clinic.slug === initialClinicSlug) ?? contexts[0];
  const initialBranch = firstContext?.branches.find((item) => item.id === initialBranchId)?.id ?? firstContext?.branches[0]?.id ?? '';
  const [step, setStep] = useState(1); const [clinicSlug, setClinicSlug] = useState(firstContext?.clinic.slug ?? ''); const [branchId, setBranchId] = useState(initialBranch);
  const [serviceId, setServiceId] = useState(firstContext?.services[0]?.id ?? ''); const [dentistId, setDentistId] = useState(fixedDentistId ?? ''); const [date, setDate] = useState(tomorrowInManila);
  const [slots, setSlots] = useState<Slot[]>([]); const [startsAt, setStartsAt] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [confirmation, setConfirmation] = useState<Confirmation | null>(null); const [closedReason, setClosedReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState('');
  const submissionInFlight = useRef(false);
  const loadingHeading = useRef<HTMLHeadingElement>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  const errorAlert = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    const stepChanged = previousStep.current !== step;
    previousStep.current = step;
    const target = submitting ? loadingHeading.current : confirmation ? confirmationHeading.current : error ? errorAlert.current : stepChanged ? stepHeading.current : null;
    if (target) {
      target.focus({ preventScroll: true });
      target.closest('section')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [submitting, confirmation, error, step]);
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
  const selectedDentist = dentists.find((item) => item.id === (fixedDentistId ?? dentistId));
  const branch = context?.branches.find((item) => item.id === branchId); const service = context?.services.find((item) => item.id === serviceId);

  function changeClinic(value: string) { const next = contexts.find((item) => item.clinic.slug === value); setClinicSlug(value); setBranchId(next?.branches[0]?.id ?? ''); setServiceId(next?.services[0]?.id ?? ''); setStartsAt(''); setSlots([]); }
  function bookAgain() {
    setConfirmation(null);
    setReceiptEmail('');
    setStep(1);
    setDate(tomorrowInManila());
    setStartsAt('');
    setSlots([]);
    setClosedReason(null);
    setError('');
    setAgreedToTerms(false);
    setRecaptchaToken('');
    recaptchaWidgetId.current = null;
  }
  async function loadAvailability() {
    if (!context || !branchId || !serviceId || !date) { setError('Please complete the clinic, branch, service, and date selections.'); return; }
    setLoading(true); setError(''); setStartsAt(''); setClosedReason(null);
    const query = new URLSearchParams({ branchId, serviceId, date }); if (fixedDentistId || dentistId) query.set('dentistId', fixedDentistId ?? dentistId);
    try { const response = await fetch(`/api/public/clinics/${encodeURIComponent(context.clinic.slug)}/availability?${query}`, { cache: 'no-store' }); const payload = await response.json() as { data?: { slots: Slot[]; closedReason: string | null }; error?: { message?: string } }; if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? 'Could not load availability'); setSlots(payload.data.slots); setClosedReason(payload.data.closedReason); setStep(2); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load availability'); } finally { setLoading(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submissionInFlight.current || !context || !startsAt) return;
    if (!agreedToTerms) { setError('Please agree to the terms before submitting.'); return; }
    if (recaptchaSiteKey && !recaptchaToken) { setError('Please complete the reCAPTCHA verification.'); return; }
    const data = new FormData(event.currentTarget); submissionInFlight.current = true; setSubmitting(true); setError('');
    // Run alongside the request so slow responses do not incur an extra delay.
    const minimumLoading = new Promise<void>((resolve) => setTimeout(resolve, 5_000));
    const payload = { clinicSlug: context.clinic.slug, branchId, serviceId, dentistId: (fixedDentistId ?? dentistId) || undefined, date, startsAt, patientFirstName: String(data.get('patientFirstName') ?? ''), patientLastName: String(data.get('patientLastName') ?? ''), patientPhone: String(data.get('patientPhone') ?? ''), patientEmail: String(data.get('patientEmail') ?? ''), chiefComplaint: String(data.get('chiefComplaint') ?? ''), agreedToTerms: true, recaptchaToken };
    try { const response = await fetch('/api/public/appointments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json() as { data?: Confirmation; error?: { message?: string } }; await minimumLoading; if (!response.ok || !result.data) throw new Error(result.error?.message ?? 'Booking could not be completed'); setReceiptEmail(payload.patientEmail.trim()); setConfirmation(result.data); setStep(4); }
    catch (caught) {
      await minimumLoading;
      setError(caught instanceof Error ? caught.message : 'Booking could not be completed');
      if (recaptchaSiteKey) {
        setRecaptchaToken('');
        if (recaptchaWidgetId.current !== null) window.grecaptcha?.reset(recaptchaWidgetId.current);
      }
    } finally { submissionInFlight.current = false; setSubmitting(false); }
  }
  if (!context) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">No bookable clinic affiliation is currently available.</div>;
  if (confirmation) return <section className="mx-auto max-w-3xl scroll-mt-[var(--booking-scroll-margin,6rem)] rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10">
    <CheckCircle2 className="mx-auto text-emerald-500" size={56} aria-hidden="true" />
    <p className="mt-5 text-sm font-bold uppercase tracking-wider text-emerald-700">Appointment request received</p>
    <h2 ref={confirmationHeading} tabIndex={-1} className="mt-2 text-3xl font-extrabold text-slate-900 focus:outline-none">Thank you for booking</h2>
    <p className="mx-auto mt-3 max-w-xl text-slate-600">The clinic will review your request and may contact you to confirm the schedule.</p>
    <span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">Pending clinic confirmation</span>
    <div className="mx-auto mt-6 max-w-md rounded-2xl bg-violet-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Booking reference</p>
      <p className="mt-1 break-all text-2xl font-extrabold text-violet-900">{confirmation.confirmationNumber}</p>
    </div>
    <dl className="mx-auto mt-7 grid max-w-xl gap-4 text-left text-sm sm:grid-cols-2">
      <div><dt className="text-slate-500">Clinic</dt><dd className="font-semibold text-slate-900">{confirmation.clinicName}</dd></div>
      <div><dt className="text-slate-500">Branch</dt><dd className="font-semibold text-slate-900">{confirmation.branchName}</dd></div>
      <div><dt className="text-slate-500">Dentist</dt><dd className="font-semibold text-slate-900">{confirmation.dentistName}</dd></div>
      <div><dt className="text-slate-500">Service</dt><dd className="font-semibold text-slate-900">{confirmation.serviceName}</dd></div>
      <div className="sm:col-span-2"><dt className="text-slate-500">Schedule · Philippine Time</dt><dd className="font-semibold text-slate-900">{displayDateTime(confirmation.startsAt)} – {displayTime(confirmation.endsAt)}</dd></div>
    </dl>
    <div className="mx-auto mt-7 flex max-w-xl items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 p-4 text-left text-sm text-violet-900">
      <Mail size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>A receipt with your booking details will be emailed to <span className="break-all font-semibold">{receiptEmail}</span>. Please allow a few minutes and check your spam folder.</p>
    </div>
    <p className="mx-auto mt-5 max-w-xl text-sm text-slate-500">Keep your booking reference. Contact the clinic if you need to change your request.</p>
    <button type="button" onClick={bookAgain} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"><CalendarDays size={18} aria-hidden="true" />Book again</button>
  </section>;

  return <div className={showVisitSummary && !submitting ? 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]' : ''}>
    <section className="min-w-0 scroll-mt-[var(--booking-scroll-margin,6rem)] overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_8px_32px_rgba(30,27,75,0.04)]">
    {submitting && <div role="status" aria-live="polite" className="flex min-h-[440px] flex-col items-center justify-center px-2 py-12 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-violet-50" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border-4 border-violet-100 border-t-violet-600 motion-safe:animate-spin" />
        <CalendarDays size={34} className="text-violet-600 motion-safe:animate-pulse" />
      </div>
      <h2 ref={loadingHeading} tabIndex={-1} className="mt-7 text-2xl font-bold text-slate-900 focus:outline-none">Sending your appointment request</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">Please keep this page open while we save your booking. Your request details will appear here shortly.</p>
      <p className="mt-6 text-sm font-semibold text-violet-700">{service?.name} · {branch?.name}</p>
      <p className="mt-1 text-sm text-slate-500">{displayDateTime(startsAt)}</p>
    </div>}
    <div hidden={submitting} aria-busy={submitting}>
      <ol className="grid grid-cols-3 border-b border-slate-100 bg-slate-50/50 px-3 py-5 sm:px-8 sm:py-6" aria-label="Booking progress">
        {['Visit details', 'Schedule', 'Your details'].map((label, index) => {
          const completed = step > index + 1;
          const active = step === index + 1;
          return <li key={label} aria-current={active ? 'step' : undefined} className="relative flex flex-col items-center gap-2.5 text-center">
            {index < 2 && <span aria-hidden="true" className={`absolute left-[calc(50%+24px)] right-[calc(-50%+24px)] top-[18px] h-px ${completed ? 'bg-violet-300' : 'bg-slate-200'}`} />}
            <span aria-hidden="true" className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${active ? 'bg-violet-600 text-white ring-4 ring-violet-100' : completed ? 'bg-violet-100 text-violet-700' : 'border border-slate-200 bg-white text-slate-400'}`}>
              {completed ? <Check size={17} /> : index + 1}
            </span>
            <span className={`text-xs font-semibold sm:text-sm ${active ? 'text-violet-700' : completed ? 'text-slate-700' : 'text-slate-500'}`}>{label}<span className="sr-only">{completed ? ', completed' : active ? ', current step' : ', upcoming'}</span></span>
          </li>;
        })}
      </ol>
      <div className="p-5 sm:p-8">
        {error && <div ref={errorAlert} tabIndex={-1} role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {step === 1 && <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Step 1 of 3</p>
          <h2 ref={stepHeading} tabIndex={-1} className="mt-2 text-2xl font-bold tracking-tight text-slate-900 focus:outline-none">Choose your visit</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Tell us where, when, and how we can help.</p>
          <div className="mt-7 grid gap-x-5 gap-y-6 sm:grid-cols-2">
            {contexts.length > 1 && <label className="text-sm font-semibold text-slate-700">Clinic
              <select value={clinicSlug} onChange={(event) => changeClinic(event.target.value)} className={fieldClassName}>
                {contexts.map((item) => <option key={item.clinic.slug} value={item.clinic.slug}>{item.clinic.name}</option>)}
              </select>
            </label>}
            <label className="text-sm font-semibold text-slate-700">Branch
              <select value={branchId} onChange={(event) => { setBranchId(event.target.value); setDentistId(fixedDentistId ?? ''); setStartsAt(''); }} className={fieldClassName}>
                {context.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {branch && <span className="mt-2.5 flex items-start gap-1.5 text-xs font-normal leading-5 text-slate-500"><MapPin size={13} className="mt-1 shrink-0" aria-hidden="true" />{[branch.address, branch.city, branch.province].filter(Boolean).join(', ') || 'Contact the clinic for location details.'}</span>}
            </label>
            <label className="text-sm font-semibold text-slate-700">Service
              <select value={serviceId} onChange={(event) => { setServiceId(event.target.value); setStartsAt(''); }} className={fieldClassName}>
                {context.services.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.durationMinutes} min)</option>)}
              </select>
              {service && <span className="mt-2.5 flex items-center gap-1.5 text-xs font-normal leading-5 text-slate-500"><Clock3 size={13} aria-hidden="true" />Allow approximately {service.durationMinutes} minutes</span>}
            </label>
            {fixedDentistId ? <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm">
              <span className="font-semibold text-violet-900">Dentist preselected</span>
              <p className="mt-1 text-violet-700">{selectedDentist ? `Dr. ${selectedDentist.firstName} ${selectedDentist.lastName}` : 'This dentist is not assigned to the selected branch.'}</p>
            </div> : <label className="text-sm font-semibold text-slate-700">Dentist
              <select value={dentistId} onChange={(event) => { setDentistId(event.target.value); setStartsAt(''); }} className={fieldClassName}>
                <option value="">Any available dentist</option>
                {dentists.map((item) => <option key={item.id} value={item.id}>Dr. {item.firstName} {item.lastName}</option>)}
              </select>
            </label>}
            <label className="min-w-0 text-sm font-semibold text-slate-700">Preferred date
              <input type="date" min={tomorrowInManila()} value={date} onChange={(event) => { setDate(event.target.value); setStartsAt(''); }} className={fieldClassName} />
            </label>
          </div>
          <div className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} aria-hidden="true" />Times in Philippine Time</p>
            <button type="button" disabled={loading || !branchId || !serviceId || (Boolean(fixedDentistId) && !selectedDentist)} onClick={loadAvailability} className={primaryButtonClassName}>
              {loading ? <Loader2 className="motion-safe:animate-spin" size={17} aria-hidden="true" /> : <CalendarDays size={17} aria-hidden="true" />}Check available times <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>}
        {step === 2 && <div>
          <button type="button" onClick={() => setStep(1)} className={backButtonClassName}><ArrowLeft size={15} />Change visit details</button>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Step 2 of 3</p>
          <h2 ref={stepHeading} tabIndex={-1} className="mt-2 text-2xl font-bold tracking-tight text-slate-900 focus:outline-none">Choose an available time</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{service?.name} at {branch?.name} · times shown in Philippine Time</p>
          {slots.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slots.map((slot) => <button type="button" key={slot.startsAt} aria-pressed={startsAt === slot.startsAt} onClick={() => setStartsAt(slot.startsAt)} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${startsAt === slot.startsAt ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50'}`}>
              <Clock3 size={16} aria-hidden="true" />{displayTime(slot.startsAt)}
            </button>)}
          </div> : closedReason ? <div className="mt-6 rounded-xl bg-slate-100 p-5 text-sm text-slate-700">The clinic is closed on this date — {closedReason}. Please choose another date.</div> : <div className="mt-6 rounded-xl bg-amber-50 p-5 text-sm text-amber-800">No open slots remain for this date. Please choose another date.</div>}
          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6"><button type="button" disabled={!startsAt} onClick={() => setStep(3)} className={primaryButtonClassName}>Continue <ArrowRight size={17} /></button></div>
        </div>}
        {step === 3 && <form onSubmit={submit}>
          <fieldset disabled={submitting} className="min-w-0">
            <button type="button" onClick={() => setStep(2)} className={backButtonClassName}><ArrowLeft size={15} />Choose another time</button>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Step 3 of 3</p>
            <h2 ref={stepHeading} tabIndex={-1} className="mt-2 text-2xl font-bold tracking-tight text-slate-900 focus:outline-none">Your contact details</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Let the clinic know who to expect and where to send your receipt.</p>
            <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900">
              <p className="flex items-center gap-2 font-semibold"><Stethoscope size={16} className="shrink-0" />{service?.name} · {branch?.name}</p>
              <p className="mt-2 flex items-center gap-2"><UserRound size={16} className="shrink-0" aria-hidden="true" /><span>Dentist: {selectedDentist ? `Dr. ${selectedDentist.firstName} ${selectedDentist.lastName}` : 'Any available dentist'}</span></p>
              <p className="mt-2 flex items-center gap-2"><Clock3 size={16} className="shrink-0" />{displayDateTime(startsAt)}</p>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">First name<input required name="patientFirstName" autoComplete="given-name" maxLength={100} className={fieldClassName} /></label>
              <label className="text-sm font-semibold text-slate-700">Last name<input required name="patientLastName" autoComplete="family-name" maxLength={100} className={fieldClassName} /></label>
              <label className="text-sm font-semibold text-slate-700">Contact number<input required name="patientPhone" autoComplete="tel" type="tel" maxLength={20} className={fieldClassName} /></label>
              <label className="text-sm font-semibold text-slate-700">Email<input required name="patientEmail" autoComplete="email" type="email" maxLength={255} className={fieldClassName} /></label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Reason for visit<textarea required name="chiefComplaint" minLength={2} maxLength={1000} rows={3} className={fieldClassName} /></label>
            </div>
            <label className="mt-5 flex items-start gap-2.5 text-sm leading-6 text-slate-600"><input required type="checkbox" checked={agreedToTerms} onChange={(event) => setAgreedToTerms(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-violet-600 focus-visible:ring-2 focus-visible:ring-violet-500" />I agree to the terms of service and consent to the clinic contacting me to confirm this appointment.</label>
            {recaptchaSiteKey && <><Script src="https://www.google.com/recaptcha/api.js" strategy="lazyOnload" /><div ref={recaptchaContainer} className="mt-4" /></>}
            <div className="mt-7 border-t border-slate-100 pt-6">
              <button disabled={submitting || !agreedToTerms || (Boolean(recaptchaSiteKey) && !recaptchaToken)} className={primaryButtonClassName}>
                {submitting ? <Loader2 className="motion-safe:animate-spin" size={18} /> : <UserRound size={18} />}Submit appointment request <ArrowRight size={16} />
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-500">Your request will be pending until the clinic confirms your schedule.</p>
            </div>
          </fieldset>
        </form>}
      </div>
    </div>
    </section>
    {showVisitSummary && !submitting && <aside aria-label="Your visit summary" className="space-y-5 lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
        <div className="bg-violet-950 px-6 py-6 text-white">
          <div className="mb-4 flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-200">Your visit</p><Stethoscope size={20} className="text-violet-300" aria-hidden="true" /></div>
          <h2 className="text-xl font-semibold leading-7">{service?.name || 'Select a service'}</h2>
          {service && <p className="mt-2 flex items-center gap-1.5 text-xs text-violet-200"><Clock3 size={13} aria-hidden="true" />{service.durationMinutes}-minute appointment</p>}
        </div>
        <dl className="space-y-5 p-6 text-sm">
          <div className="relative pl-7"><dt className="text-xs text-slate-500"><MapPin size={17} className="absolute left-0 top-0.5 text-violet-500" aria-hidden="true" />Location</dt><dd className="mt-1 font-medium text-slate-800">{branch?.name || 'Select a branch'}</dd>{branch && <dd className="mt-1 text-xs leading-5 text-slate-500">{[branch.address, branch.city, branch.province].filter(Boolean).join(', ')}</dd>}</div>
          <div className="relative pl-7"><dt className="text-xs text-slate-500"><UserRound size={17} className="absolute left-0 top-0.5 text-violet-500" aria-hidden="true" />Dentist</dt><dd className="mt-1 font-medium text-slate-800">{selectedDentist ? `Dr. ${selectedDentist.firstName} ${selectedDentist.lastName}` : 'Any available dentist'}</dd></div>
          <div className="relative pl-7"><dt className="text-xs text-slate-500"><CalendarDays size={17} className="absolute left-0 top-0.5 text-violet-500" aria-hidden="true" />Preferred schedule</dt><dd className="mt-1 font-medium text-slate-800">{date ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' }).format(new Date(`${date}T00:00:00+08:00`)) : 'Select a date'}</dd><dd className="mt-1 text-xs text-slate-500">{startsAt ? `${displayTime(startsAt)} · Philippine Time` : 'Choose a time in the next step'}</dd></div>
        </dl>
      </div>
      <div className="rounded-2xl border border-violet-100/80 bg-violet-50/70 p-5">
        <h3 className="text-sm font-semibold text-violet-950">What happens next?</h3>
        <div className="mt-4 flex gap-3"><Mail size={17} className="mt-0.5 shrink-0 text-violet-500" aria-hidden="true" /><p className="text-xs leading-5 text-slate-600">You’ll receive an email with your request details.</p></div>
        <div className="mt-3 flex gap-3"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-violet-500" aria-hidden="true" /><p className="text-xs leading-5 text-slate-600">The clinic will review your request and confirm your schedule.</p></div>
      </div>
    </aside>}
  </div>;
}
