"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  FileText,
  Grid3X3,
  HeartPulse,
  ImageIcon,
  MapPin,
  Phone,
  Shield,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type { PatientDetail } from "@/lib/clinic-patients";
import type { TreatmentRecord } from "@/lib/clinic-treatments";
import type { OdontogramData } from "@/lib/clinic-odontogram";
import type { ClinicDentistOption } from "@/lib/clinic-dentists";
import HistoryEditor from "./HistoryEditor";
import AppointmentActions from "@/components/app/dashboard/AppointmentActions";
import { canDentistManageAppointment } from "@/lib/dentist-schedule-navigation";
import OdontogramChart from "@/components/app/odontogram/OdontogramChart";
import TreatmentPlansTab from "@/components/app/TreatmentPlansTab";
import PatientPrescriptionsTab from "@/app/(clinic)/app/(shell)/patients/[patientId]/PatientPrescriptionsTab";
import FilesTab from "@/components/app/FilesTab";
import AiImagingTab from "@/components/app/AiImagingTab";
import { HmoTab } from "@/app/(clinic)/app/(shell)/patients/[patientId]/PatientDetailClient";

const show = (value: string | null | undefined) => value || "—";
const when = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));

type TabId =
  | "overview"
  | "medicalHistory"
  | "dentalHistory"
  | "treatmentHistory"
  | "appointments"
  | "odontogram"
  | "treatmentPlans"
  | "prescriptions"
  | "files"
  | "aiImaging"
  | "hmo";

export default function PatientProfile({
  clinicId,
  data,
  basePath,
  sort,
  treatments,
  appointmentDentistId,
  branchId,
  odontogram = null,
  dentists = [],
  canUsePrescriptions = false,
  canUseOdontogram = false,
  canUseFiles = false,
  canUseAiImaging = false,
  canUseHmo = false,
  canUseTreatmentPlans = false,
  canManageTreatmentPlans = false,
}: {
  clinicId: string;
  data: PatientDetail;
  basePath: string;
  sort: "asc" | "desc";
  treatments: TreatmentRecord[];
  appointmentDentistId?: string | null;
  branchId?: string;
  odontogram?: OdontogramData | null;
  dentists?: ClinicDentistOption[];
  canUsePrescriptions?: boolean;
  canUseOdontogram?: boolean;
  canUseFiles?: boolean;
  canUseAiImaging?: boolean;
  canUseHmo?: boolean;
  canUseTreatmentPlans?: boolean;
  canManageTreatmentPlans?: boolean;
}) {
  const patient = data.patient;
  const name = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
  const [tab, setTab] = useState<TabId>("overview");

  const tabs: Array<{ id: TabId; label: string; icon: typeof UserRound }> = [
    { id: "overview", label: "Overview", icon: UserRound },
    { id: "medicalHistory", label: "Medical History", icon: HeartPulse },
    { id: "dentalHistory", label: "Dental History", icon: Stethoscope },
    { id: "treatmentHistory", label: "Treatment History", icon: ClipboardList },
    { id: "appointments", label: "Appointments", icon: CalendarDays },
    ...(canUseOdontogram ? [{ id: "odontogram" as const, label: "Odontogram", icon: Grid3X3 }] : []),
    ...(canUseTreatmentPlans ? [{ id: "treatmentPlans" as const, label: "Treatment Plans", icon: ClipboardList }] : []),
    ...(canUsePrescriptions ? [{ id: "prescriptions" as const, label: "Prescriptions", icon: FileText }] : []),
    ...(canUseFiles ? [{ id: "files" as const, label: "Clinical Files", icon: ImageIcon }] : []),
    ...(canUseAiImaging ? [{ id: "aiImaging" as const, label: "AI Imaging", icon: Activity }] : []),
    ...(canUseHmo ? [{ id: "hmo" as const, label: "HMO Coverage", icon: Shield }] : []),
  ];

  return (
    <div className="p-4 sm:p-8">
      <Link href={basePath} className="text-sm font-semibold text-violet-600">
        ← Back to patients
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl bg-violet-950 p-6 text-white sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-700 text-lg font-bold">
            {patient.firstName[0]}
            {patient.lastName[0]}
          </div>
          <div>
            <p className="font-mono text-xs text-violet-300">
              {patient.patientNumber}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{name}</h1>
            <p className="mt-1 text-sm capitalize text-violet-200">
              {patient.status} patient
            </p>
          </div>
        </div>
        <Link
          href={`/app/dentist/encounters?patientId=${patient.id}`}
          className="inline-flex items-center gap-1.5 self-start rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
        >
          <ClipboardList size={14} />
          Encounters
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 overflow-x-auto rounded-xl bg-violet-50 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              tab === id
                ? "bg-white text-violet-900 shadow-sm"
                : "text-violet-600 hover:text-violet-800"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && (
          <section className="grid gap-5 lg:grid-cols-3">
            <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <UserRound size={18} className="text-violet-600" />
                Demographics & contact
              </h2>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                {[
                  ["Date of birth", patient.dateOfBirth],
                  ["Sex", patient.sex],
                  ["Civil status", patient.civilStatus],
                  ["Occupation", patient.occupation],
                  ["Nationality", patient.nationality],
                  ["Mobile", patient.phone],
                  ["Email", patient.email],
                  ["City", patient.city],
                  ["Province", patient.province],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {label}
                    </dt>
                    <dd className="mt-1 font-medium capitalize text-slate-800">
                      {show(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              {patient.address && (
                <p className="mt-5 flex items-start gap-2 border-t pt-4 text-sm text-slate-600">
                  <MapPin size={16} className="mt-0.5" />
                  {patient.address}
                </p>
              )}
            </article>
            <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">Emergency & guardian</h2>
              <div className="mt-4 space-y-5 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">
                    {show(patient.emergencyContactName)}
                  </p>
                  <p className="text-slate-500">
                    {show(patient.emergencyContactRelation)}
                  </p>
                  {patient.emergencyContactPhone && (
                    <p className="mt-1 flex items-center gap-1 text-violet-600">
                      <Phone size={14} />
                      {patient.emergencyContactPhone}
                    </p>
                  )}
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Guardian
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {show(patient.guardianName)}
                  </p>
                  <p className="text-slate-500">{show(patient.guardianRelation)}</p>
                  {patient.guardianPhone && (
                    <p className="mt-1 text-violet-600">{patient.guardianPhone}</p>
                  )}
                </div>
              </div>
            </article>
          </section>
        )}

        {tab === "medicalHistory" && (
          <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <HeartPulse className="text-rose-500" />
              Medical history
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {data.medicalHistory.versions.length} saved version(s)
              {data.medicalHistory.current
                ? ` · latest ${when(data.medicalHistory.current.createdAt)} by ${data.medicalHistory.current.recordedByName ?? "staff"}`
                : ""}
            </p>
            {data.medicalHistory.versions.length > 1 && (
              <details className="mt-2 text-xs text-slate-500">
                <summary className="cursor-pointer font-semibold text-violet-600">View version timeline</summary>
                <ol className="mt-2 space-y-1">
                  {data.medicalHistory.versions.map((version, index) => (
                    <li key={version.id}>
                      Version {data.medicalHistory.versions.length - index} · {when(version.createdAt)} · {version.recordedByName ?? "staff"}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <HistoryEditor
              kind="medical"
              clinicId={clinicId}
              patientId={patient.id}
              current={data.medicalHistory.current}
            />
          </section>
        )}

        {tab === "dentalHistory" && (
          <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Stethoscope className="text-violet-600" />
              Dental history
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {data.dentalHistory.versions.length} saved version(s)
              {data.dentalHistory.current
                ? ` · latest ${when(data.dentalHistory.current.createdAt)} by ${data.dentalHistory.current.recordedByName ?? "staff"}`
                : ""}
            </p>
            {data.dentalHistory.versions.length > 1 && (
              <details className="mt-2 text-xs text-slate-500">
                <summary className="cursor-pointer font-semibold text-violet-600">View version timeline</summary>
                <ol className="mt-2 space-y-1">
                  {data.dentalHistory.versions.map((version, index) => (
                    <li key={version.id}>
                      Version {data.dentalHistory.versions.length - index} · {when(version.createdAt)} · {version.recordedByName ?? "staff"}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <HistoryEditor
              kind="dental"
              clinicId={clinicId}
              patientId={patient.id}
              current={data.dentalHistory.current}
            />
          </section>
        )}

        {tab === "treatmentHistory" && (
          <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <ClipboardList className="text-violet-600" />
              Treatment history
            </h2>
            {treatments.length ? (
              <div className="mt-5 divide-y divide-slate-100">
                {treatments.map((item) => (
                  <article key={item.id} className="grid gap-2 py-4 text-sm sm:grid-cols-4">
                    <div>
                      <p className="font-bold text-slate-900">{item.serviceName ?? "Dental procedure"}</p>
                      <p className="text-xs text-slate-500">{item.performedAt ? when(item.performedAt) : "Date unavailable"}</p>
                    </div>
                    <p className="text-slate-600">Tooth/area: {item.toothRef ?? "General"}</p>
                    <p className="text-slate-600">
                      {item.dentistFirstName ? `Dr. ${item.dentistFirstName} ${item.dentistLastName}` : "Dentist"}
                    </p>
                    <Link href={`/app/dentist/encounters/${item.encounterId}`} className="font-semibold text-violet-600">
                      Open encounter →
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No treatment records.</p>
            )}
          </section>
        )}

        {tab === "appointments" && (
          <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <CalendarDays className="text-violet-600" />
                Appointment history
              </h2>
              <Link
                href={`${basePath}/${patient.id}?appointmentSort=${sort === "asc" ? "desc" : "asc"}`}
                className="text-xs font-semibold text-violet-600"
              >
                Sort {sort === "asc" ? "newest" : "oldest"}
              </Link>
            </div>
            {data.appointments.length ? (
              <div className="mt-5 divide-y divide-slate-100">
                {data.appointments.map((item) => (
                  <article key={item.id} className="grid gap-2 py-4 text-sm sm:grid-cols-5 sm:items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{when(item.startsAt)}</p>
                      <p className="text-slate-500">{item.branchName}</p>
                    </div>
                    <p className="text-slate-700">{item.serviceName ?? "Dental appointment"}</p>
                    <p className="text-slate-700">
                      {item.dentistFirstName ? `Dr. ${item.dentistFirstName} ${item.dentistLastName}` : "Dentist unassigned"}
                    </p>
                    <span className="justify-self-start rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold capitalize text-violet-700">
                      {item.status.replace("_", " ")}
                    </span>
                    <div className="space-y-2">
                      {canDentistManageAppointment(item.dentistId, appointmentDentistId) && (
                        <AppointmentActions clinicId={clinicId} appointmentId={item.id} status={item.status} />
                      )}
                      {item.encounterId && (
                        <Link href={`/app/dentist/encounters/${item.encounterId}`} className="block text-xs font-semibold text-violet-600">
                          Open encounter →
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No appointments recorded.</p>
            )}
          </section>
        )}

        {tab === "odontogram" && canUseOdontogram && (
          <OdontogramChart
            clinicId={clinicId}
            patientId={patient.id}
            initial={odontogram ?? { events: [], currentState: [] }}
            dentists={dentists}
          />
        )}

        {tab === "treatmentPlans" && canUseTreatmentPlans && (
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <TreatmentPlansTab clinicId={clinicId} patientId={patient.id} canManage={canManageTreatmentPlans} dentists={dentists} />
          </div>
        )}

        {tab === "prescriptions" && canUsePrescriptions && (
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <PatientPrescriptionsTab clinicId={clinicId} patientId={patient.id} />
          </div>
        )}

        {tab === "files" && canUseFiles && (
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <FilesTab clinicId={clinicId} patientId={patient.id} branchId={branchId ?? ""} allowUpload={Boolean(branchId)} />
          </div>
        )}

        {tab === "aiImaging" && canUseAiImaging && (
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <AiImagingTab clinicId={clinicId} patientId={patient.id} canConfirm={canManageTreatmentPlans} />
          </div>
        )}

        {tab === "hmo" && canUseHmo && (
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <HmoTab clinicId={clinicId} patientId={patient.id} />
          </div>
        )}
      </div>
    </div>
  );
}
