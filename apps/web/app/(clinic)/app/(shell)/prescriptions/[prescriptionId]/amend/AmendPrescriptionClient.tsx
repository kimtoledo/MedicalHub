"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, FileText, Loader2, AlertTriangle } from "lucide-react";
import type { PrescriptionDetail } from "../page";
import type { ClinicDentistOption } from "@/lib/clinic-dentists";

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

export default function AmendPrescriptionClient({
  original,
  clinicId,
  dentists = [],
}: {
  original: PrescriptionDetail;
  clinicId: string;
  dentists?: ClinicDentistOption[];
}) {
  const router = useRouter();

  const [prcLicenseNumber, setPrcLicenseNumber] = useState(original.prcLicenseNumber ?? "");
  const [notes, setNotes] = useState(original.notes ?? "");
  const [dentistId, setDentistId] = useState("");
  const [rows, setRows] = useState<MedicineRow[]>(
    original.items.length > 0
      ? original.items.map((item, idx) => ({
          id: idx,
          medicineName: item.medicineName,
          dosage: item.dosage ?? "",
          frequency: item.frequency ?? "",
          duration: item.duration ?? "",
          specialInstructions: item.specialInstructions ?? "",
        }))
      : [{ id: Date.now(), medicineName: "", dosage: "", frequency: "", duration: "", specialInstructions: "" }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const validRows = rows.filter((r) => r.medicineName.trim());
    if (validRows.length === 0) { setError("Add at least one medicine"); return; }
    if (dentists.length > 0 && !dentistId) { setError("Select which dentist is prescribing"); return; }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/clinic/${clinicId}/prescriptions/${original.id}/amend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
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
        }
      );

      const body = await res.json() as {
        success: boolean;
        data?: { prescriptionId: string };
        error?: { message: string };
      };
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to create amendment");
      router.push(`/app/prescriptions/${body.data!.prescriptionId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const patientName = original.patientNameSnapshot
    ?? `${original.patient.firstName} ${original.patient.lastName}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/app/prescriptions/${original.id}`}
          className="flex items-center gap-2 text-sm text-violet-500 hover:text-violet-700 mb-2"
        >
          <ArrowLeft size={15} /> Back to original prescription
        </Link>
        <h1 className="text-2xl font-bold text-violet-900">Amend Prescription</h1>
        <p className="text-violet-500 text-sm mt-0.5">
          Patient: <span className="font-semibold text-violet-700">{patientName}</span>
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          <strong>You are amending an issued prescription.</strong> The original will remain on record.
          This action creates a new prescription linked back to the original.
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
              placeholder="Pre-filled from profile"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>

        {/* Medicines */}
        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-violet-900">Medicines</h2>
          <div>
            <p className="text-xs font-semibold text-violet-700 mb-2">Common medicines — click to add</p>
            <div className="flex flex-wrap gap-2">
              {MEDICINE_PRESETS.map((preset) => (
                <button
                  key={preset.medicineName}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-full border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50"
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
                <div className="grid grid-cols-3 gap-3">
                  {(["dosage", "frequency", "duration"] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-violet-700 mb-1 capitalize">
                        {field}
                      </label>
                      <input
                        type="text"
                        value={row[field]}
                        onChange={(e) => updateRow(row.id, field, e.target.value)}
                        placeholder={field === "dosage" ? "500mg" : field === "frequency" ? "TID" : "7 days"}
                        className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                  ))}
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
            className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 font-semibold transition-colors"
          >
            <Plus size={14} /> Add another medicine
          </button>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-5">
          <label className="block text-xs font-semibold text-violet-700 mb-2">
            Additional notes
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
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
          <Link
            href={`/app/prescriptions/${original.id}`}
            className="px-5 py-2.5 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {submitting ? "Creating amendment…" : "Issue Amendment"}
          </button>
        </div>
      </form>
    </div>
  );
}
