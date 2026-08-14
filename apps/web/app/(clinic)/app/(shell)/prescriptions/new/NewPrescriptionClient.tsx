"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FileText, User, Calendar, Loader2 } from "lucide-react";
import type { ClinicDentistOption } from "@/lib/clinic-dentists";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UnbilledEncounter = {
  id: string;
  date: string;
  patientFirstName: string;
  patientLastName: string;
  patientNumber: string;
  chiefComplaint: string | null;
  branchId: string | null;
};

type MedicineRow = {
  id: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  specialInstructions: string;
};

// ---------------------------------------------------------------------------
// Common medicine presets — clicking one fills the next empty row, or adds
// a new row below, so a dentist rarely needs to type these by hand.
// ---------------------------------------------------------------------------

const MEDICINE_PRESETS: Array<Omit<MedicineRow, "id" | "specialInstructions">> = [
  { medicineName: "Amoxicillin 500mg", dosage: "500mg", frequency: "TID", duration: "7 days" },
  { medicineName: "Co-Amoxiclav 625mg", dosage: "625mg", frequency: "BID", duration: "7 days" },
  { medicineName: "Mefenamic Acid 500mg", dosage: "500mg", frequency: "TID", duration: "5 days" },
  { medicineName: "Ibuprofen 400mg", dosage: "400mg", frequency: "TID", duration: "5 days" },
  { medicineName: "Paracetamol 500mg", dosage: "500mg", frequency: "Q4H PRN for pain", duration: "5 days" },
  { medicineName: "Clindamycin 300mg", dosage: "300mg", frequency: "TID", duration: "7 days" },
  { medicineName: "Metronidazole 500mg", dosage: "500mg", frequency: "TID", duration: "7 days" },
  { medicineName: "Cefuroxime 500mg", dosage: "500mg", frequency: "BID", duration: "7 days" },
  { medicineName: "Tranexamic Acid 500mg", dosage: "500mg", frequency: "TID", duration: "5 days" },
  { medicineName: "Chlorhexidine Mouthwash 0.12%", dosage: "15mL rinse", frequency: "BID", duration: "7 days" },
];

// ---------------------------------------------------------------------------
// Common note presets — clicking one toggles it in/out of the notes field,
// joined by "; ". Free typing still works alongside these.
// ---------------------------------------------------------------------------

const NOTES_PRESETS = [
  "Take with food",
  "Avoid alcohol while taking this medication",
  "Complete the full course even if symptoms improve",
  "Discontinue and consult clinic if allergic reaction occurs",
  "Drink plenty of water",
  "Do not exceed recommended dosage",
  "Patient advised of possible side effects",
  "Follow-up if symptoms persist after treatment",
];

function toggleTerm(current: string, term: string) {
  const parts = current.split(";").map((item) => item.trim()).filter(Boolean);
  const next = parts.includes(term) ? parts.filter((item) => item !== term) : [...parts, term];
  return next.join("; ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewPrescriptionClient({
  clinicId,
  initialEncounterId,
  embedded = false,
  dentists = [],
}: {
  clinicId: string;
  initialEncounterId?: string;
  embedded?: boolean;
  dentists?: ClinicDentistOption[];
}) {
  const router = useRouter();
  const containerClass = embedded
    ? "p-4 sm:p-6 space-y-6"
    : "p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6";

  // Step 1: encounter selection
  const [encounters, setEncounters] = useState<UnbilledEncounter[]>([]);
  const [loadingEncounters, setLoadingEncounters] = useState(true);
  const [selectedEncounter, setSelectedEncounter] = useState<UnbilledEncounter | null>(null);

  // Form state
  const [prcLicenseNumber, setPrcLicenseNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [dentistId, setDentistId] = useState("");
  const [rows, setRows] = useState<MedicineRow[]>([
    { id: Date.now(), medicineName: "", dosage: "", frequency: "", duration: "", specialInstructions: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load finalized encounters that can have prescriptions (and, once a dentist is
  // attributed, that dentist's saved PRC license default).
  useEffect(() => {
    setLoadingEncounters(true);
    const query = dentistId ? `?dentistId=${encodeURIComponent(dentistId)}` : "";
    fetch(`/api/clinic/${clinicId}/prescriptions/encounters${query}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data: {
        success: boolean;
        data?: { encounters: UnbilledEncounter[]; prcLicenseNumber: string | null };
      }) => {
        if (!data.success || !data.data) return;
        setEncounters(data.data.encounters);
        setPrcLicenseNumber(data.data.prcLicenseNumber ?? "");
        if (initialEncounterId) {
          setSelectedEncounter(
            data.data.encounters.find((encounter) => encounter.id === initialEncounterId) ?? null,
          );
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingEncounters(false));
  }, [clinicId, initialEncounterId, dentistId]);

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: Date.now(), medicineName: "", dosage: "", frequency: "", duration: "", specialInstructions: "" },
    ]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function applyPreset(preset: (typeof MEDICINE_PRESETS)[number]) {
    setRows((prev) => {
      const emptyIndex = prev.findIndex((row) => !row.medicineName.trim());
      if (emptyIndex !== -1) {
        return prev.map((row, index) => (index === emptyIndex ? { ...row, ...preset } : row));
      }
      return [...prev, { id: Date.now(), specialInstructions: "", ...preset }];
    });
  }

  function updateRow(id: number, field: keyof Omit<MedicineRow, "id">, value: string) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEncounter) { setError("Please select an encounter"); return; }
    const validRows = rows.filter((r) => r.medicineName.trim());
    if (validRows.length === 0) { setError("Add at least one medicine"); return; }
    if (dentists.length > 0 && !dentistId) { setError("Select which dentist is prescribing"); return; }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/clinic/${clinicId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          encounterId: selectedEncounter.id,
          prcLicenseNumber: prcLicenseNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          dentistId: dentistId || undefined,
          items: validRows.map((r, idx) => ({
            medicineName: r.medicineName.trim(),
            dosage: r.dosage.trim() || undefined,
            frequency: r.frequency.trim() || undefined,
            duration: r.duration.trim() || undefined,
            specialInstructions: r.specialInstructions.trim() || undefined,
            sortOrder: idx,
          })),
        }),
      });

      const body = await res.json() as { success: boolean; data?: { prescriptionId: string }; error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to issue prescription");
      router.push(`/app/prescriptions/${body.data!.prescriptionId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step 1: select encounter ─────────────────────────────────────────────
  if (!selectedEncounter) {
    return (
      <div className={containerClass}>
        <div>
          <h1 className="text-2xl font-bold text-violet-900">New Prescription</h1>
          <p className="text-violet-500 text-sm mt-0.5">
            Select a finalized encounter to issue a prescription for
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
          {loadingEncounters ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : encounters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText size={36} className="text-violet-200" />
              <p className="text-violet-400 text-sm font-medium">No finalized encounters available</p>
              <p className="text-violet-300 text-xs">Encounters must be finalized before issuing a prescription.</p>
            </div>
          ) : (
            <ul className="divide-y divide-violet-50">
              {encounters.map((enc) => (
                <li key={enc.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedEncounter(enc)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-violet-50/60 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-violet-900 text-sm">
                          {enc.patientFirstName} {enc.patientLastName}
                        </span>
                        <span className="text-xs text-violet-400 bg-violet-50 px-1.5 py-0.5 rounded font-medium">
                          {enc.patientNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-violet-400">
                        <Calendar size={11} />
                        {enc.date}
                        {enc.chiefComplaint && (
                          <span className="truncate max-w-[200px]">· {enc.chiefComplaint}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-violet-600 bg-violet-100 px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      Select
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ─── Step 2: prescription form ────────────────────────────────────────────
  return (
    <div className={containerClass}>
      <div>
        <button
          type="button"
          onClick={() => setSelectedEncounter(null)}
          className="text-violet-500 hover:text-violet-700 text-sm mb-2 flex items-center gap-1"
        >
          ← Change encounter
        </button>
        <h1 className="text-2xl font-bold text-violet-900">New Prescription</h1>
        <p className="text-violet-500 text-sm mt-0.5">
          Patient: <span className="font-semibold text-violet-700">{selectedEncounter.patientFirstName} {selectedEncounter.patientLastName}</span>
          {" · "}Encounter date: <span className="font-semibold text-violet-700">{selectedEncounter.date}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PRC License */}
        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-violet-900">Dentist information</h2>
          {dentists.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-violet-700 mb-1">
                Prescribing dentist <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={dentistId}
                onChange={(e) => setDentistId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">Select dentist</option>
                {dentists.map((item) => (
                  <option key={item.id} value={item.id}>Dr. {item.firstName} {item.lastName}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">
              PRC License Number
            </label>
            <input
              type="text"
              value={prcLicenseNumber}
              onChange={(e) => setPrcLicenseNumber(e.target.value)}
              placeholder="Pre-filled from your profile if set"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>

        {/* Medicines */}
        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-violet-900">Medicines</h2>

          <div>
            <p className="text-xs font-semibold text-violet-700 mb-2">Common medicines — click to add</p>
            <div className="flex flex-wrap gap-1.5">
              {MEDICINE_PRESETS.map((preset) => (
                <button
                  key={preset.medicineName}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-full border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                >
                  {preset.medicineName} · {preset.frequency} · {preset.duration}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div key={row.id} className="border border-violet-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-violet-500 uppercase tracking-wide">
                    #{idx + 1}
                  </span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="p-1 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-violet-700 mb-1">
                    Medicine name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={row.medicineName}
                    onChange={(e) => updateRow(row.id, "medicineName", e.target.value)}
                    placeholder="e.g. Amoxicillin 500mg capsule"
                    className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-violet-700 mb-1">Dosage</label>
                    <input
                      type="text"
                      value={row.dosage}
                      onChange={(e) => updateRow(row.id, "dosage", e.target.value)}
                      placeholder="e.g. 500mg"
                      className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-violet-700 mb-1">Frequency</label>
                    <input
                      type="text"
                      value={row.frequency}
                      onChange={(e) => updateRow(row.id, "frequency", e.target.value)}
                      placeholder="e.g. TID"
                      className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-violet-700 mb-1">Duration</label>
                    <input
                      type="text"
                      value={row.duration}
                      onChange={(e) => updateRow(row.id, "duration", e.target.value)}
                      placeholder="e.g. 7 days"
                      className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-violet-700 mb-1">
                    Special instructions / Sig
                  </label>
                  <input
                    type="text"
                    value={row.specialInstructions}
                    onChange={(e) => updateRow(row.id, "specialInstructions", e.target.value)}
                    placeholder="e.g. Take after meals"
                    className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 font-semibold transition-colors"
          >
            <Plus size={14} /> Add another medicine
          </button>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-5">
          <label className="block text-xs font-semibold text-violet-700 mb-2">
            Additional notes
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {NOTES_PRESETS.map((term) => {
              const active = notes.split(";").map((item) => item.trim()).includes(term);
              return (
                <button
                  key={term}
                  type="button"
                  onClick={() => setNotes(toggleTerm(notes, term))}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    active
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-violet-200 text-violet-700 hover:bg-violet-50"
                  }`}
                >
                  {term}
                </button>
              );
            })}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Pumili sa itaas, o mag-type ng sarili — general prescription notes (optional)"
            className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => history.back()}
            className="px-5 py-2.5 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {submitting ? "Issuing…" : "Issue Prescription"}
          </button>
        </div>
      </form>
    </div>
  );
}
