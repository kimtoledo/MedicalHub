"use client";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { EncounterRecord } from "@/lib/clinic-encounters";
import type { PatientListItem } from "@/lib/clinic-patients";
import type { ClinicBranchContext } from "@/lib/clinic-types";
import type { ClinicDentistOption } from "@/lib/clinic-dentists";
import { useConfirm } from "@/components/ConfirmDialogProvider";
const field =
  "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100";
export default function EncounterForm({
  clinicId,
  branches,
  patients,
  dentists = [],
  encounter,
  initialPatientId,
  initialAppointmentId,
}: {
  clinicId: string;
  branches: ClinicBranchContext[];
  patients: PatientListItem[];
  dentists?: ClinicDentistOption[];
  encounter?: EncounterRecord;
  initialPatientId?: string;
  initialAppointmentId?: string;
}) {
  const confirmDialog = useConfirm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const readOnly = encounter?.status === "final";
  async function submit(form: HTMLFormElement, status: "draft" | "final") {
    if (!form.reportValidity()) return;
    if (
      status === "final" &&
      !(await confirmDialog({
        title: "Finalize encounter",
        message: "Finalize this encounter? Finalized clinical records are read-only.",
        tone: "danger",
      }))
    )
      return;
    setSaving(true);
    setError("");
    const values = Object.fromEntries(
      Array.from(new FormData(form).entries())
        .map(([key, value]) => [key, String(value).trim()])
        .filter(([, value]) => value),
    );
    const payload = encounter
      ? {
          branchId: values.branchId,
          date: values.date,
          chiefComplaint: values.chiefComplaint,
          examination: values.examination,
          assessment: values.assessment,
          procedures: values.procedures,
          recommendations: values.recommendations,
          notes: values.notes,
          status,
        }
      : { ...values, status };
    try {
      const response = await fetch(
        encounter
          ? `/api/clinic/encounters/${encounter.id}?clinicId=${encodeURIComponent(clinicId)}`
          : `/api/clinic/encounters?clinicId=${encodeURIComponent(clinicId)}`,
        {
          method: encounter ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as {
        data?: { id: string };
        error?: { message?: string };
      };
      if (!response.ok || !result.data)
        throw new Error(
          result.error?.message ?? "Encounter could not be saved",
        );
      window.location.assign(`/app/dentist/encounters/${result.data.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Encounter could not be saved",
      );
      setSaving(false);
    }
  }
  return (
    <form className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Patient
          <select
            required
            disabled={Boolean(encounter)}
            name="patientId"
            defaultValue={encounter?.patientId ?? initialPatientId ?? ""}
            className={field}
          >
            <option value="">Select patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.patientNumber} · {patient.lastName},{" "}
                {patient.firstName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Branch
          <select
            required
            disabled={readOnly}
            name="branchId"
            defaultValue={encounter?.branchId ?? branches[0]?.id ?? ""}
            className={field}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Encounter date
          <input
            required
            disabled={readOnly}
            name="date"
            type="date"
            defaultValue={
              encounter?.date ??
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Manila",
              }).format(new Date())
            }
            className={field}
          />
        </label>
        {!encounter && (
          <label className="text-sm font-semibold text-slate-700">
            Appointment ID (optional)
            <input
              name="appointmentId"
              defaultValue={initialAppointmentId ?? ""}
              className={field}
            />
          </label>
        )}
        {!encounter && dentists.length > 0 && (
          <label className="text-sm font-semibold text-slate-700">
            Attribute to dentist
            <select required name="dentistId" defaultValue="" className={field}>
              <option value="" disabled>
                Select dentist
              </option>
              {dentists.map((item) => (
                <option key={item.id} value={item.id}>
                  Dr. {item.firstName} {item.lastName}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {[
        ["chiefComplaint", "Chief complaint"],
        ["examination", "Examination / findings"],
        ["assessment", "Assessment / diagnosis"],
        ["procedures", "Procedures / treatments"],
        ["recommendations", "Recommendations"],
        ["notes", "Clinical notes"],
      ].map(([name, label]) => (
        <label
          key={name}
          className="block text-sm font-semibold text-slate-700"
        >
          {label}
          <textarea
            disabled={readOnly}
            name={name}
            rows={name === "notes" ? 3 : 4}
            defaultValue={
              (encounter?.[name as keyof EncounterRecord] as string) ?? ""
            }
            className={field}
          />
        </label>
      ))}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {readOnly ? (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          Finalized encounter · read-only clinical record
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            disabled={saving}
            onClick={(event) => void submit(event.currentTarget.form!, "draft")}
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-violet-300 px-4 py-2.5 text-sm font-bold text-violet-700"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            Save draft
          </button>
          <button
            disabled={saving}
            onClick={(event) => void submit(event.currentTarget.form!, "final")}
            type="button"
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            Finalize encounter
          </button>
        </div>
      )}
    </form>
  );
}
