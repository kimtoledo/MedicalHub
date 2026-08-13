'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CalendarDays, FileText, HeartPulse, Link2, Loader2, LogIn, LogOut, ShieldCheck, Star, UserRound } from 'lucide-react';
import PatientReviewsPanel from '@/components/portal/PatientReviewsPanel';

type LinkRecord = { clinicId: string; patientId: string; clinicName: string; patientFirstName: string; patientLastName: string };
type Appointment = { id: string; clinicId: string; patientId: string; clinicName: string; serviceName: string | null; status: string; startsAt: string; endsAt: string };
type Invoice = { id: string; clinicId: string; patientId: string; invoiceNumber: string; status: string; totalAmountPhp: string; issuedAt: string | null };
type Plan = { id: string; clinicId: string; patientId: string; title: string; status: string; createdAt: string };
type PatientRequest = { id: string; clinicId: string; type: string; status: string; createdAt: string };
type PortalData = { account: { email: string | null; phone: string | null }; links: LinkRecord[]; appointments: Appointment[]; invoices: Invoice[]; treatmentPlans: Plan[]; requests: PatientRequest[] };
type Tab = 'home' | 'appointments' | 'billing' | 'plans' | 'reviews' | 'profile';

class PortalApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...init });
  const body = await response.json().catch(() => ({})) as { success?: boolean; data?: T; error?: { message?: string } };
  if (!response.ok || !body.success) throw new PortalApiError(body.error?.message ?? 'Request failed', response.status);
  return body.data as T;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function Empty({ children }: { children: string }) {
  return <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-8 text-center text-sm text-slate-500">{children}</div>;
}

export default function PatientPortalPage() {
  const [data, setData] = useState<PortalData | null>(null);
  const [checking, setChecking] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({ clinicSlug: '', patientNumber: '', consent: false });
  const [requestForm, setRequestForm] = useState<{ appointment: Appointment; type: 'appointment_cancel' | 'appointment_reschedule'; reason: string; preferredDate: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      setData(await api<PortalData>('/api/patient/portal'));
      setError(null);
    } catch (caught) {
      setData(null);
      if (!(caught instanceof PortalApiError) || caught.status !== 401) setLoadFailed(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    if (authMode === 'signup' && password !== confirmPassword) return setError('Passwords do not match.');
    setBusy(true); setError(null);
    try {
      if (authMode === 'signup') {
        await api('/api/patient/auth/sign-up', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...(identifier.includes('@') ? { email: identifier } : { phone: identifier }), password }) });
      }
      await api('/api/patient/auth/sign-in', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier, password }) });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to access the patient portal.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try { await api('/api/patient/auth/sign-out', { method: 'POST' }); } finally { setData(null); setBusy(false); setTab('home'); }
  }

  async function linkClinic(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setNotice(null);
    try {
      await api('/api/patient/links/by-reference', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(linkForm) });
      setLinkForm({ clinicSlug: '', patientNumber: '', consent: false });
      setNotice('Clinic record linked with your consent.');
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to link this clinic record.'); }
    finally { setBusy(false); }
  }

  async function revoke(link: LinkRecord) {
    if (!confirm(`Remove access to your ${link.clinicName} record? You can link it again later with consent.`)) return;
    setBusy(true); setError(null);
    try {
      await api(`/api/patient/links/${link.clinicId}/${link.patientId}`, { method: 'DELETE' });
      setNotice(`${link.clinicName} access removed.`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to remove clinic access.'); }
    finally { setBusy(false); }
  }

  async function sendAppointmentRequest(event: FormEvent) {
    event.preventDefault();
    if (!requestForm) return;
    setBusy(true); setError(null);
    try {
      await api('/api/patient/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clinicId: requestForm.appointment.clinicId, patientId: requestForm.appointment.patientId, appointmentId: requestForm.appointment.id, type: requestForm.type, payload: { reason: requestForm.reason, ...(requestForm.preferredDate ? { preferredDate: requestForm.preferredDate } : {}) } }) });
      setRequestForm(null); setNotice('Your request was sent to the clinic for review.'); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit the request.'); }
    finally { setBusy(false); }
  }

  async function sendContactRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const link = data?.links.find((item) => item.clinicId === form.get('clinicId'));
    if (!link) return;
    const email = String(form.get('email') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();
    if (!email && !phone) { setError('Enter a new email or mobile number.'); return; }
    setBusy(true); setError(null);
    try {
      await api('/api/patient/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clinicId: link.clinicId, patientId: link.patientId, type: 'contact_update', payload: { ...(email ? { email } : {}), ...(phone ? { phone } : {}) } }) });
      event.currentTarget.reset(); setNotice('Contact update sent for clinic review.'); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit the update.'); }
    finally { setBusy(false); }
  }

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-[#F7F6FB]"><Loader2 className="animate-spin text-violet-600" aria-label="Loading patient portal" /></main>;

  if (loadFailed) return <main className="flex min-h-screen items-center justify-center bg-[#F7F6FB] p-4"><div className="max-w-md rounded-2xl border border-violet-100 bg-white p-6 text-center"><h1 className="text-xl font-bold text-violet-950">Patient portal unavailable</h1><p className="mt-2 text-sm text-slate-500">We couldn’t securely load your portal. Check your connection and try again.</p><button onClick={() => { setChecking(true); void load(); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"><Loader2 size={15} /> Retry</button></div></main>;

  if (!data) return (
    <main className="min-h-screen bg-[#F7F6FB] p-4 sm:p-8">
      <div className="mx-auto max-w-md rounded-3xl border border-violet-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold text-violet-600">Dentra.ph</p>
        <h1 className="mt-1 text-2xl font-bold text-violet-950">{authMode === 'signin' ? 'Patient portal sign in' : 'Create patient account'}</h1>
        <p className="mt-2 text-sm text-slate-500">Your account only shows clinic records you explicitly link.</p>
        <form onSubmit={authenticate} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Email or mobile<input required autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label>
          <label className="block text-sm font-semibold text-slate-700">Password<input required minLength={10} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label>
          {authMode === 'signup' && <label className="block text-sm font-semibold text-slate-700">Confirm password<input required minLength={10} autoComplete="new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 font-semibold text-white disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}{authMode === 'signin' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setError(null); }} className="mt-4 w-full text-sm font-semibold text-violet-700">{authMode === 'signin' ? 'New patient? Create an account' : 'Already have an account? Sign in'}</button>
        <p className="mt-5 border-t pt-4 text-xs text-slate-500">Can’t access your account? Contact a linked clinic to verify your email or mobile number. Password reset is not yet available online.</p>
      </div>
    </main>
  );

  const tabs: Array<{ id: Tab; label: string; icon: typeof CalendarDays }> = [
    { id: 'home', label: 'Home', icon: HeartPulse }, { id: 'appointments', label: 'Visits', icon: CalendarDays }, { id: 'billing', label: 'Billing', icon: FileText }, { id: 'plans', label: 'Plans', icon: ShieldCheck }, { id: 'reviews', label: 'Reviews', icon: Star }, { id: 'profile', label: 'Profile', icon: UserRound },
  ];

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-24">
      <header className="border-b border-violet-100 bg-white px-4 py-4"><div className="mx-auto flex max-w-5xl items-center justify-between"><div><p className="text-sm font-bold text-violet-600">Dentra.ph</p><p className="text-xs text-slate-500">Patient Portal</p></div><button disabled={busy} onClick={() => void signOut()} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700"><LogOut size={15} /> Sign out</button></div></header>
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError(null)} className="font-semibold">Dismiss</button></div>}

        {tab === 'home' && <><section><h1 className="text-2xl font-bold text-violet-950">Welcome to your care portal</h1><p className="mt-1 text-sm text-slate-500">{data.links.length ? `${data.links.length} clinic record${data.links.length === 1 ? '' : 's'} linked with consent.` : 'Link a clinic record to view your care activity.'}</p></section><div className="grid gap-4 sm:grid-cols-3">{[{ label: 'Appointments', value: data.appointments.length, tab: 'appointments' as Tab }, { label: 'Invoices', value: data.invoices.length, tab: 'billing' as Tab }, { label: 'Treatment plans', value: data.treatmentPlans.length, tab: 'plans' as Tab }].map((item) => <button key={item.label} onClick={() => setTab(item.tab)} className="rounded-2xl border border-violet-100 bg-white p-5 text-left shadow-sm"><p className="text-2xl font-bold text-violet-900">{item.value}</p><p className="text-sm text-slate-500">{item.label}</p></button>)}</div><section className="rounded-2xl border border-violet-100 bg-white p-5"><h2 className="font-bold text-violet-900">Privacy boundary</h2><p className="mt-2 text-sm text-slate-600">Only explicitly linked clinic records appear here. Clinical notes, odontograms, and prescriptions are not included.</p></section></>}

        {tab === 'appointments' && <section className="space-y-3"><h1 className="text-2xl font-bold text-violet-950">Appointments</h1>{data.appointments.length ? data.appointments.map((item) => <article key={item.id} className="rounded-2xl border border-violet-100 bg-white p-5"><button onClick={() => setExpanded(expanded === item.id ? null : item.id)} className="w-full text-left"><p className="font-bold text-violet-900">{item.serviceName ?? 'Dental appointment'}</p><p className="mt-1 text-sm text-slate-600">{item.clinicName} · {dateTime(item.startsAt)}</p><span className="mt-2 inline-block rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold capitalize text-violet-700">{item.status.replaceAll('_', ' ')}</span></button>{expanded === item.id && <div className="mt-4 border-t border-violet-100 pt-4"><p className="text-sm text-slate-600">Scheduled until {dateTime(item.endsAt)}.</p>{!['cancelled', 'completed', 'no_show'].includes(item.status) && <div className="mt-3 flex gap-2"><button onClick={() => setRequestForm({ appointment: item, type: 'appointment_reschedule', reason: '', preferredDate: '' })} className="rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700">Request reschedule</button><button onClick={() => setRequestForm({ appointment: item, type: 'appointment_cancel', reason: '', preferredDate: '' })} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Request cancellation</button></div>}</div>}</article>) : <Empty>No appointments are available from your linked clinics.</Empty>}</section>}

        {tab === 'billing' && <section className="space-y-3"><h1 className="text-2xl font-bold text-violet-950">Invoices and receipts</h1>{data.invoices.length ? data.invoices.map((item) => <article key={item.id} className="rounded-2xl border border-violet-100 bg-white p-5"><button onClick={() => setExpanded(expanded === item.id ? null : item.id)} className="flex w-full items-center justify-between gap-4 text-left"><div><p className="font-mono font-bold text-violet-900">{item.invoiceNumber}</p><p className="mt-1 text-sm text-slate-500">{item.issuedAt ? new Date(item.issuedAt).toLocaleDateString('en-PH') : 'Not issued'}</p></div><div className="text-right"><p className="font-bold text-violet-900">₱{Number(item.totalAmountPhp).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p><p className="text-xs capitalize text-slate-500">{item.status.replaceAll('_', ' ')}</p></div></button>{expanded === item.id && <p className="mt-4 border-t border-violet-100 pt-4 text-sm text-slate-600">This summary intentionally excludes private clinical notes. Contact the clinic for an itemized copy or payment assistance.</p>}</article>) : <Empty>No invoices are available from your linked clinics.</Empty>}</section>}

        {tab === 'plans' && <section className="space-y-3"><h1 className="text-2xl font-bold text-violet-950">Treatment plan summaries</h1>{data.treatmentPlans.length ? data.treatmentPlans.map((item) => <article key={item.id} className="rounded-2xl border border-violet-100 bg-white p-5"><p className="font-bold text-violet-900">{item.title}</p><p className="mt-1 text-sm capitalize text-slate-500">{item.status.replaceAll('_', ' ')} · Created {new Date(item.createdAt).toLocaleDateString('en-PH')}</p></article>) : <Empty>No treatment plan summaries are available.</Empty>}</section>}

        {tab === 'reviews' && <PatientReviewsPanel />}

        {tab === 'profile' && <div className="space-y-5"><section className="rounded-2xl border border-violet-100 bg-white p-5"><h1 className="text-xl font-bold text-violet-950">Account and security</h1><p className="mt-2 text-sm text-slate-600">{data.account.email ?? data.account.phone}</p><p className="mt-2 text-xs text-slate-500">Patient sessions use a separate secure sign-in and do not grant clinic staff access.</p></section><section className="rounded-2xl border border-violet-100 bg-white p-5"><h2 className="flex items-center gap-2 font-bold text-violet-900"><Link2 size={17} /> Linked clinics</h2><div className="mt-3 space-y-2">{data.links.map((item) => <div key={`${item.clinicId}-${item.patientId}`} className="flex items-center justify-between rounded-xl bg-violet-50 p-3"><div><p className="text-sm font-semibold text-violet-900">{item.clinicName}</p><p className="text-xs text-slate-500">{item.patientFirstName} {item.patientLastName}</p></div><button disabled={busy} onClick={() => void revoke(item)} className="text-xs font-semibold text-red-700">Remove access</button></div>)}{!data.links.length && <p className="text-sm text-slate-500">No clinic records linked.</p>}</div></section><form onSubmit={linkClinic} className="rounded-2xl border border-violet-100 bg-white p-5"><h2 className="font-bold text-violet-900">Link a clinic record</h2><p className="mt-1 text-xs text-slate-500">Use the clinic web address name and patient number provided by the clinic. Your account email or mobile must match their record.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Clinic link name<input required placeholder="smile-bright-dental" value={linkForm.clinicSlug} onChange={(event) => setLinkForm({ ...linkForm, clinicSlug: event.target.value.toLowerCase() })} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label><label className="text-xs font-semibold text-slate-600">Patient number<input required placeholder="SBD-000001" value={linkForm.patientNumber} onChange={(event) => setLinkForm({ ...linkForm, patientNumber: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label></div><label className="mt-3 flex items-start gap-2 text-sm text-slate-600"><input required type="checkbox" checked={linkForm.consent} onChange={(event) => setLinkForm({ ...linkForm, consent: event.target.checked })} className="mt-1" /> I consent to this clinic record being visible in my Dentra patient account.</label><button disabled={busy} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-60"><Link2 size={15} /> Link record</button></form>{data.links.length > 0 && <form onSubmit={sendContactRequest} className="rounded-2xl border border-violet-100 bg-white p-5"><h2 className="font-bold text-violet-900">Request a contact update</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><select required name="clinicId" className="h-11 rounded-xl border border-violet-200 px-3 text-sm">{data.links.map((item) => <option key={item.clinicId} value={item.clinicId}>{item.clinicName}</option>)}</select><input name="email" type="email" placeholder="New email (optional)" className="h-11 rounded-xl border border-violet-200 px-3 text-sm" /><input name="phone" placeholder="New mobile (optional)" className="h-11 rounded-xl border border-violet-200 px-3 text-sm" /></div><button disabled={busy} className="mt-3 rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700">Send for clinic review</button></form>}<section className="rounded-2xl border border-violet-100 bg-white p-5"><h2 className="font-bold text-violet-900">Request history</h2>{data.requests.length ? <div className="mt-3 space-y-2">{data.requests.map((item) => <div key={item.id} className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="capitalize">{item.type.replaceAll('_', ' ')} · {new Date(item.createdAt).toLocaleDateString('en-PH')}</span><span className="font-semibold capitalize text-violet-700">{item.status}</span></div>)}</div> : <p className="mt-2 text-sm text-slate-500">No requests submitted.</p>}</section></div>}
      </div>

      {requestForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRequestForm(null)}><form onSubmit={sendAppointmentRequest} onClick={(event) => event.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6"><h2 className="text-lg font-bold text-violet-900">Request {requestForm.type === 'appointment_cancel' ? 'cancellation' : 'reschedule'}</h2>{requestForm.type === 'appointment_reschedule' && <label className="block text-sm font-semibold text-slate-700">Preferred date<input required type="date" value={requestForm.preferredDate} onChange={(event) => setRequestForm({ ...requestForm, preferredDate: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label>}<label className="block text-sm font-semibold text-slate-700">Reason<textarea required minLength={3} maxLength={500} rows={3} value={requestForm.reason} onChange={(event) => setRequestForm({ ...requestForm, reason: event.target.value })} className="mt-1 w-full rounded-xl border border-violet-200 p-3" /></label><p className="text-xs text-slate-500">The appointment does not change until the clinic approves this request.</p><div className="flex gap-2"><button type="button" onClick={() => setRequestForm(null)} className="flex-1 rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700">Cancel</button><button disabled={busy} className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Send request</button></div></form></div>}

      <nav className="fixed inset-x-0 bottom-0 border-t border-violet-100 bg-white"><div className="mx-auto grid max-w-5xl grid-cols-6">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setTab(id); setNotice(null); }} className={`flex flex-col items-center gap-1 py-3 text-[10px] font-semibold ${tab === id ? 'text-violet-700' : 'text-slate-400'}`}><Icon size={18} />{label}</button>)}</div></nav>
    </main>
  );
}
