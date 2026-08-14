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

type NoteFieldName =
  | "chiefComplaint"
  | "examination"
  | "assessment"
  | "procedures"
  | "recommendations"
  | "notes";

const NOTE_FIELDS: Array<{ name: NoteFieldName; label: string; rows: number; presets: string[] }> = [
  {
    name: "chiefComplaint",
    label: "Chief complaint",
    rows: 4,
    presets: [
      "Chipped front tooth",
      "Toothache",
      "Sensitivity to hot/cold",
      "Bleeding gums",
      "Swollen gums",
      "Loose tooth",
      "Broken filling",
      "Jaw pain",
      "Bad breath",
      "Routine checkup",
      "Braces adjustment",
      "Wisdom tooth pain",
    ],
  },
  {
    name: "examination",
    label: "Examination / findings",
    rows: 4,
    presets: [
      "Dental caries noted",
      "Gingival inflammation",
      "Plaque buildup",
      "Calculus deposits",
      "Fractured tooth",
      "Missing tooth",
      "Impacted wisdom tooth",
      "Normal oral findings",
      "Periodontal pocket depth increased",
      "Tooth mobility noted",
    ],
  },
  {
    name: "assessment",
    label: "Assessment / diagnosis",
    rows: 4,
    presets: [
      "Dental caries",
      "Gingivitis",
      "Periodontitis",
      "Pulpitis",
      "Dental abscess",
      "Malocclusion",
      "Tooth fracture",
      "Impacted tooth",
      "Healthy dentition",
    ],
  },
  {
    name: "procedures",
    label: "Procedures / treatments",
    rows: 4,
    presets: [
      "Oral prophylaxis (cleaning)",
      "Composite filling",
      "Amalgam filling",
      "Tooth extraction",
      "Root canal treatment",
      "Crown placement",
      "Scaling and polishing",
      "Fluoride treatment",
      "X-ray taken",
      "Local anesthesia administered",
    ],
  },
  {
    name: "recommendations",
    label: "Recommendations",
    rows: 4,
    presets: [
      "Follow-up in 1 week",
      "Follow-up in 1 month",
      "Follow-up in 6 months",
      "Refer to specialist",
      "Maintain oral hygiene",
      "Avoid hard foods",
      "Take prescribed medication as directed",
      "Schedule next cleaning",
    ],
  },
  {
    name: "notes",
    label: "Clinical notes",
    rows: 3,
    presets: [
      "Patient tolerated procedure well",
      "No complications",
      "Patient advised on home care",
      "Follow-up needed",
    ],
  },
];

function toggleTerm(current: string, term: string) {
  const parts = current
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
  const next = parts.includes(term)
    ? parts.filter((item) => item !== term)
    : [...parts, term];
  return next.join("; ");
}

function NoteField({
  label,
  name,
  rows,
  presets,
  value,
  onChange,
  disabled,
}: {
  label: string;
  name: string;
  rows: number;
  presets: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const active = new Set(
    value
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {presets.map((term) => (
          <button
            key={term}
            type="button"
            disabled={disabled}
            onClick={() => onChange(toggleTerm(value, term))}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              active.has(term)
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {term}
          </button>
        ))}
      </div>
      <textarea
        disabled={disabled}
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Pumili sa itaas, o mag-type ng iyo mismong sagot"
        className={field}
      />
    </label>
  );
}

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
  const [noteValues, setNoteValues] = useState<Record<NoteFieldName, string>>({
    chiefComplaint: encounter?.chiefComplaint ?? "",
    examination: encounter?.examination ?? "",
    assessment: encounter?.assessment ?? "",
    procedures: encounter?.procedures ?? "",
    recommendations: encounter?.recommendations ?? "",
    notes: encounter?.notes ?? "",
  });
  const readOnly = encounter?.status === "final";
  function setNoteValue(name: NoteFieldName, value: string) {
    setNoteValues((current) => ({ ...current, [name]: value }));
  }
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
      {NOTE_FIELDS.map((item) => (
        <NoteField
          key={item.name}
          label={item.label}
          name={item.name}
          rows={item.rows}
          presets={item.presets}
          value={noteValues[item.name]}
          onChange={(value) => setNoteValue(item.name, value)}
          disabled={readOnly}
        />
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
