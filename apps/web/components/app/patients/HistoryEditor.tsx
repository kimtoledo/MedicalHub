"use client";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { DentalHistory, MedicalHistory } from "@/lib/clinic-patients";
const input =
  "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm";
export default function HistoryEditor({
  kind,
  clinicId,
  patientId,
  current,
}: {
  kind: "medical" | "dental";
  clinicId: string;
  patientId: string;
  current: MedicalHistory | DentalHistory | null;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = Object.fromEntries(
      Array.from(new FormData(event.currentTarget).entries()).map(
        ([key, value]) => [key, String(value).trim()],
      ),
    );
    try {
      const response = await fetch(
        `/api/clinic/patients/${encodeURIComponent(patientId)}/${kind}-history?clinicId=${encodeURIComponent(clinicId)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok)
        throw new Error(result.error?.message ?? "History could not be saved");
      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "History could not be saved",
      );
      setSaving(false);
    }
  }
  const med = kind === "medical" ? (current as MedicalHistory | null) : null;
  const dental = kind === "dental" ? (current as DentalHistory | null) : null;
  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      {kind === "medical" ? (
        <>
          <label className="text-sm font-medium text-slate-700">
            Allergies
            <textarea
              name="allergies"
              defaultValue={med?.allergies ?? ""}
              rows={2}
              className={input}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Current medications
            <textarea
              name="currentMedications"
              defaultValue={med?.currentMedications ?? ""}
              rows={2}
              className={input}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Major conditions
            <textarea
              name="majorConditions"
              defaultValue={med?.majorConditions ?? ""}
              rows={2}
              className={input}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Pregnancy status
            <select
              name="isPregnant"
              defaultValue={med?.isPregnant ?? "not_applicable"}
              className={input}
            >
              <option value="not_applicable">Not applicable</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Physician name
            <input
              name="physicianName"
              defaultValue={med?.physicianName ?? ""}
              className={input}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Physician phone
            <input
              name="physicianPhone"
              defaultValue={med?.physicianPhone ?? ""}
              className={input}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Additional notes
            <textarea
              name="notes"
              defaultValue={med?.notes ?? ""}
              rows={3}
              className={input}
            />
          </label>
        </>
      ) : (
        <>
          <label className="text-sm font-medium text-slate-700">
            Last dental visit
            <input
              name="lastDentalVisit"
              type="date"
              defaultValue={dental?.lastDentalVisit ?? ""}
              className={input}
            />
          </label>
          {[
            ["hasSensitivity", "Tooth sensitivity"],
            ["hasBleedingGums", "Bleeding gums"],
            ["hasPain", "Current pain"],
          ].map(([name, label]) => (
            <label key={name} className="text-sm font-medium text-slate-700">
              {label}
              <select
                name={name}
                defaultValue={
                  (dental?.[name as keyof DentalHistory] as string | null) ??
                  "no"
                }
                className={input}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
          ))}
          <label className="text-sm font-medium text-slate-700">
            Previous treatments
            <textarea
              name="previousTreatments"
              defaultValue={dental?.previousTreatments ?? ""}
              rows={2}
              className={input}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Oral habits
            <textarea
              name="oralHabits"
              defaultValue={dental?.oralHabits ?? ""}
              rows={2}
              className={input}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Orthodontic history
            <textarea
              name="orthodonticHistory"
              defaultValue={dental?.orthodonticHistory ?? ""}
              rows={2}
              className={input}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Chief concerns
            <textarea
              name="chiefConcerns"
              defaultValue={dental?.chiefConcerns ?? ""}
              rows={2}
              className={input}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Additional notes
            <textarea
              name="notes"
              defaultValue={dental?.notes ?? ""}
              rows={3}
              className={input}
            />
          </label>
        </>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2"
        >
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={17} />
          ) : (
            <Save size={17} />
          )}
          Save new version
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Saving appends a timestamped version; prior answers remain in the
          record.
        </p>
      </div>
    </form>
  );
}
