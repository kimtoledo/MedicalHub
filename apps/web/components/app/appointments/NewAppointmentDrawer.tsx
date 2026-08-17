'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, Loader2, Search, X } from 'lucide-react';

type Patient = { id: string; patientNumber: string; firstName: string; lastName: string };
type Options = {
  branches: Array<{ id: string; name: string }>;
  dentists: Array<{ id: string; firstName: string; lastName: string; branchId: string }>;
  services: Array<{ id: string; name: string; durationMinutes: string; workflowMode: 'quick' | 'standard' }>;
};

const todayManila = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export default function NewAppointmentDrawer({ clinicId, branchId, onCreated }: { clinicId: string; branchId: string | null; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(branchId ?? '');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayManila());
  const [slots, setSlots] = useState<Array<{ startsAt: string; endsAt: string }>>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState('Select a service, dentist, and date.');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const field = 'mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200';

  useEffect(() => {
    if (!open) return;
    setLoading(true); setError('');
    const query = new URLSearchParams({ clinicId });
    if (branchId) query.set('branchId', branchId);
    fetch(`/api/clinic/appointment-options?${query}`, { cache: 'no-store' })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message ?? 'Appointment options unavailable'); return payload.data as Options; })
      .then((data) => { setOptions(data); setSelectedBranchId(branchId ?? data.branches[0]?.id ?? ''); })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Appointment options unavailable'))
      .finally(() => setLoading(false));
  }, [open, clinicId, branchId]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ clinicId, search: patientSearch, page: '1', pageSize: '50' });
      fetch(`/api/clinic/patients?${query}`, { cache: 'no-store' })
        .then((response) => response.json())
        .then((payload) => setPatients(payload.data?.items ?? []))
        .catch(() => setPatients([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, clinicId, patientSearch]);

  const dentists = useMemo(() => options?.dentists.filter((item) => item.branchId === selectedBranchId) ?? [], [options, selectedBranchId]);
  useEffect(() => { if (!selectedBranchId || !selectedServiceId || !selectedDentistId || !selectedDate) { setSlots([]); return; } setLoadingSlots(true); setAvailabilityMessage(''); const query = new URLSearchParams({ clinicId, branchId: selectedBranchId, serviceId: selectedServiceId, dentistId: selectedDentistId, date: selectedDate }); fetch(`/api/clinic/appointment-availability?${query}`, { cache: 'no-store' }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message ?? 'Availability unavailable'); return payload.data; }).then((data) => { setSlots(data.slots ?? []); setAvailabilityMessage(data.closedReason ?? (data.slots?.length ? '' : 'No available times for this selection.')); }).catch((caught) => { setSlots([]); setAvailabilityMessage(caught instanceof Error ? caught.message : 'Availability unavailable'); }).finally(() => setLoadingSlots(false)); }, [clinicId, selectedBranchId, selectedServiceId, selectedDentistId, selectedDate]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/clinic/appointments?clinicId=${encodeURIComponent(clinicId)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ branchId: String(form.get('branchId')), patientId: String(form.get('patientId')), dentistId: String(form.get('dentistId')), serviceId: String(form.get('serviceId')), startsAt: String(form.get('startsAt')), notes: String(form.get('notes') ?? '').trim() || undefined }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { setError(payload?.error?.message ?? 'Appointment could not be created.'); setSaving(false); return; }
    setSaving(false); setOpen(false); onCreated();
  }

  return <>
    <button onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700"><CalendarPlus size={17} />New appointment</button>
    {open && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="dialog" aria-modal="true" aria-labelledby="new-appointment-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><h2 id="new-appointment-title" className="text-2xl font-bold text-violet-950">New appointment</h2><p className="mt-1 text-sm text-slate-500">Schedule an existing clinic patient.</p></div><button onClick={() => setOpen(false)} aria-label="Close new appointment" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading || !options ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-violet-600" /></div> : <form onSubmit={submit} className="mt-6 space-y-5">
          <div><label className="text-sm font-semibold text-slate-700">Find patient<div className="relative"><Search size={16} className="absolute left-3 top-4 text-slate-400" /><input value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Name, patient number, or mobile" className={`${field} pl-9`} /></div></label><label className="mt-3 block text-sm font-semibold text-slate-700">Patient<select required name="patientId" defaultValue="" className={field}><option value="" disabled>Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.patientNumber} · {patient.lastName}, {patient.firstName}</option>)}</select></label><p className="mt-2 text-xs text-slate-500">Patient not registered? <Link href="/app/patients" className="font-semibold text-violet-700 underline">Register them first</Link>.</p></div>
          <label className="block text-sm font-semibold text-slate-700">Branch<select required name="branchId" value={selectedBranchId} onChange={(event) => { setSelectedBranchId(event.target.value); setSelectedDentistId(''); }} className={field}>{options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">Service<select required name="serviceId" value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)} className={field}><option value="" disabled>Select service</option>{options.services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} min{service.workflowMode === 'quick' ? ' · Quick' : ''}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">Dentist<select required name="dentistId" value={selectedDentistId} onChange={(event) => setSelectedDentistId(event.target.value)} className={field}><option value="" disabled>Select dentist</option>{dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>Dr. {dentist.firstName} {dentist.lastName}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">Date<input required type="date" min={todayManila()} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className={field} /></label>
          <label className="block text-sm font-semibold text-slate-700">Available time<select required name="startsAt" defaultValue="" disabled={loadingSlots || !slots.length} className={field}><option value="" disabled>{loadingSlots ? 'Checking availability…' : 'Select available time'}</option>{slots.map((slot) => <option key={slot.startsAt} value={slot.startsAt}>{new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(new Date(slot.startsAt))}</option>)}</select>{availabilityMessage && <span className="mt-1 block text-xs font-normal text-amber-700">{availabilityMessage}</span>}</label>
          <label className="block text-sm font-semibold text-slate-700">Internal note <span className="font-normal text-slate-400">(optional)</span><textarea name="notes" rows={3} maxLength={5000} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>
          <button disabled={saving || !selectedBranchId || !dentists.length} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin" /> : <CalendarPlus size={17} />}Create confirmed appointment</button>
        </form>}
      </div>
    </div>}
  </>;
}
