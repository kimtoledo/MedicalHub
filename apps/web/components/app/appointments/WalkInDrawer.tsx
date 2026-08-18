"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Search, UserRoundPlus, X } from "lucide-react";
import { todayManila } from "../dashboard/types";

type Patient = {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
};
type Options = {
  branches: Array<{ id: string; name: string }>;
  dentists: Array<{
    id: string;
    firstName: string;
    lastName: string;
    branchId: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: string;
    workflowMode: "quick" | "standard";
  }>;
};
type Slot = { startsAt: string; endsAt: string };

const field =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200";

const slotLabel = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export default function WalkInDrawer({
  clinicId,
  branchId,
  onCreated,
}: {
  clinicId: string;
  branchId: string | null;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(branchId ?? "");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDentistId, setSelectedDentistId] = useState("");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdAppointmentId, setCreatedAppointmentId] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => firstFieldRef.current?.focus());
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingRef.current) setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", close);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ clinicId });
    if (branchId) query.set("branchId", branchId);
    fetch(`/api/clinic/appointment-options?${query}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error?.message ?? "Walk-in options unavailable");
        return payload.data as Options;
      })
      .then((data) => {
        const activeBranchId = branchId ?? data.branches[0]?.id ?? "";
        const branchDentists = data.dentists.filter(
          (dentist) => dentist.branchId === activeBranchId,
        );
        const preferredService =
          data.services.find((service) => service.workflowMode === "quick") ??
          data.services[0];
        setOptions(data);
        setSelectedBranchId(activeBranchId);
        setSelectedServiceId(preferredService?.id ?? "");
        setSelectedDentistId(branchDentists.length === 1 ? branchDentists[0].id : "");
      })
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : "Walk-in options unavailable",
        ),
      )
      .finally(() => setLoading(false));
  }, [open, clinicId, branchId]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({
        clinicId,
        search: patientSearch.trim(),
        page: "1",
        pageSize: "50",
      });
      fetch(`/api/clinic/patients?${query}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((payload) => setPatients(payload.data?.items ?? []))
        .catch((caught) => {
          if (!(caught instanceof DOMException && caught.name === "AbortError"))
            setPatients([]);
        });
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, clinicId, patientSearch]);

  const dentists = useMemo(
    () =>
      options?.dentists.filter(
        (dentist) => dentist.branchId === selectedBranchId,
      ) ?? [],
    [options, selectedBranchId],
  );

  useEffect(() => {
    if (dentists.length === 1) setSelectedDentistId(dentists[0].id);
    else if (!dentists.some((dentist) => dentist.id === selectedDentistId))
      setSelectedDentistId("");
  }, [dentists, selectedDentistId]);

  useEffect(() => {
    if (!open || !selectedBranchId || !selectedServiceId || !selectedDentistId) {
      setSlot(null);
      setAvailabilityMessage("Select a service and dentist.");
      return;
    }
    const controller = new AbortController();
    setLoadingSlots(true);
    setSlot(null);
    setAvailabilityMessage("");
    const query = new URLSearchParams({
      clinicId,
      branchId: selectedBranchId,
      serviceId: selectedServiceId,
      dentistId: selectedDentistId,
      date: todayManila(),
    });
    fetch(`/api/clinic/appointment-availability?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error?.message ?? "Availability unavailable");
        return payload.data as { slots?: Slot[]; closedReason?: string | null };
      })
      .then((data) => {
        const first = data.slots?.[0] ?? null;
        setSlot(first);
        setAvailabilityMessage(
          data.closedReason ??
            (first ? "" : "No available walk-in time remains today."),
        );
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setAvailabilityMessage(
          caught instanceof Error ? caught.message : "Availability unavailable",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => controller.abort();
  }, [open, clinicId, selectedBranchId, selectedServiceId, selectedDentistId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slot || !patientId) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/clinic/appointments?clinicId=${encodeURIComponent(clinicId)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            branchId: selectedBranchId,
            patientId,
            dentistId: selectedDentistId,
            serviceId: selectedServiceId,
            startsAt: slot.startsAt,
            notes: String(form.get("notes") ?? "").trim() || "Walk-in visit",
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.id)
        throw new Error(payload?.error?.message ?? "Walk-in could not be created");

      const appointmentId = String(payload.data.id);
      setCreatedAppointmentId(appointmentId);
      const checkInResponse = await fetch(
        `/api/clinic/appointments/${encodeURIComponent(appointmentId)}/status?clinicId=${encodeURIComponent(clinicId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "checked_in" }),
        },
      );
      if (!checkInResponse.ok) {
        setError(
          "The appointment was created, but automatic check-in failed. Open the visit to check the patient in.",
        );
        onCreated();
        return;
      }
      onCreated();
      window.location.assign(`/app/appointments/${appointmentId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Walk-in could not be created");
    } finally {
      setSaving(false);
    }
  }

  async function registerPatient() {
    const firstName = newFirstName.trim();
    const lastName = newLastName.trim();
    if (!firstName || !lastName) {
      setRegistrationError("First and last name are required.");
      return;
    }
    setRegistering(true);
    setRegistrationError("");
    try {
      const response = await fetch(
        `/api/clinic/patients?clinicId=${encodeURIComponent(clinicId)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            phone: newPhone.trim() || undefined,
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.id || !payload?.data?.patientNumber)
        throw new Error(payload?.error?.message ?? "Patient could not be registered");
      const patient: Patient = {
        id: String(payload.data.id),
        patientNumber: String(payload.data.patientNumber),
        firstName,
        lastName,
      };
      setPatients((current) => [patient, ...current]);
      setPatientId(patient.id);
      setPatientSearch(lastName);
      setShowRegistration(false);
      setNewFirstName("");
      setNewLastName("");
      setNewPhone("");
    } catch (caught) {
      setRegistrationError(
        caught instanceof Error ? caught.message : "Patient could not be registered",
      );
    } finally {
      setRegistering(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setCreatedAppointmentId("");
          setOpen(true);
        }}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
      >
        <UserRoundPlus size={17} /> Add walk-in
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="walk-in-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !saving) setOpen(false);
          }}
        >
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="walk-in-title" className="text-2xl font-bold text-violet-950">
                  Add walk-in
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use the first available time today and check the patient in.
                </p>
              </div>
              <button
                disabled={saving}
                onClick={() => setOpen(false)}
                aria-label="Close walk-in"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {error ? (
              <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            {createdAppointmentId ? (
              <Link
                href={`/app/appointments/${createdAppointmentId}`}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                Open created visit <ArrowRight size={15} />
              </Link>
            ) : loading || !options ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-violet-600" />
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Find patient
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-4 text-slate-400" />
                      <input
                        ref={firstFieldRef}
                        value={patientSearch}
                        onChange={(event) => setPatientSearch(event.target.value)}
                        placeholder="Name, patient number, or mobile"
                        className={`${field} pl-9`}
                      />
                    </div>
                  </label>
                  <label className="mt-3 block text-sm font-semibold text-slate-700">
                    Patient
                    <select
                      required
                      value={patientId}
                      onChange={(event) => setPatientId(event.target.value)}
                      className={field}
                    >
                      <option value="" disabled>
                        Select patient
                      </option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.patientNumber} · {patient.lastName}, {patient.firstName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRegistrationError("");
                      setShowRegistration((current) => !current);
                    }}
                    className="mt-2 text-xs font-bold text-violet-700 underline"
                  >
                    {showRegistration ? "Cancel new patient" : "+ Register a new patient here"}
                  </button>
                  {showRegistration ? (
                    <div className="mt-3 grid gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-700">
                        First name
                        <input value={newFirstName} onChange={(event) => setNewFirstName(event.target.value)} maxLength={100} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Last name
                        <input value={newLastName} onChange={(event) => setNewLastName(event.target.value)} maxLength={100} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                        Mobile <span className="font-normal text-slate-400">(optional)</span>
                        <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} maxLength={20} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal" />
                      </label>
                      {registrationError ? <p role="alert" className="text-xs text-red-700 sm:col-span-2">{registrationError}</p> : null}
                      <button type="button" disabled={registering || !newFirstName.trim() || !newLastName.trim()} onClick={() => void registerPatient()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white disabled:opacity-50 sm:col-span-2">
                        {registering ? <Loader2 size={14} className="animate-spin" /> : <UserRoundPlus size={14} />} Register and select patient
                      </button>
                    </div>
                  ) : null}
                </div>

                <label className="block text-sm font-semibold text-slate-700">
                  Branch
                  <select
                    required
                    value={selectedBranchId}
                    onChange={(event) => setSelectedBranchId(event.target.value)}
                    className={field}
                  >
                    {options.branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Service
                  <select
                    required
                    value={selectedServiceId}
                    onChange={(event) => setSelectedServiceId(event.target.value)}
                    className={field}
                  >
                    {options.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} · {service.durationMinutes} min
                        {service.workflowMode === "quick" ? " · Quick" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Dentist
                  <select
                    required
                    value={selectedDentistId}
                    onChange={(event) => setSelectedDentistId(event.target.value)}
                    className={field}
                  >
                    <option value="" disabled>
                      Select dentist
                    </option>
                    {dentists.map((dentist) => (
                      <option key={dentist.id} value={dentist.id}>
                        Dr. {dentist.firstName} {dentist.lastName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-900">First available today</p>
                  {loadingSlots ? (
                    <p className="mt-1 inline-flex items-center gap-2 text-sm text-emerald-700">
                      <Loader2 size={14} className="animate-spin" /> Checking schedule…
                    </p>
                  ) : slot ? (
                    <p className="mt-1 text-sm text-emerald-700">
                      {slotLabel(slot.startsAt)}–{slotLabel(slot.endsAt)} · patient will be checked in
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-700">{availabilityMessage}</p>
                  )}
                </div>

                <label className="block text-sm font-semibold text-slate-700">
                  Internal note <span className="font-normal text-slate-400">(optional)</span>
                  <textarea
                    name="notes"
                    rows={2}
                    maxLength={5000}
                    placeholder="Defaults to Walk-in visit"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </label>

                <button
                  disabled={saving || !patientId || !slot || !selectedDentistId}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 size={17} className="animate-spin" /> : <UserRoundPlus size={17} />}
                  Create and check in walk-in
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
