import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Grid3X3,
  HeartPulse,
  MapPin,
  Phone,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type { PatientDetail } from "@/lib/clinic-patients";
import type { TreatmentRecord } from "@/lib/clinic-treatments";
import HistoryEditor from "./HistoryEditor";
const show = (value: string | null | undefined) => value || "—";
const when = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
export default function PatientProfile({
  clinicId,
  data,
  basePath,
  sort,
  treatments,
}: {
  clinicId: string;
  data: PatientDetail;
  basePath: string;
  sort: "asc" | "desc";
  treatments: TreatmentRecord[];
}) {
  const patient = data.patient;
  const name = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
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
            {data.medicalHistory.versions.length > 1 && (
              <details className="mt-2 text-xs text-slate-500">
                <summary className="cursor-pointer font-semibold text-violet-600">View version timeline</summary>
                <ol className="mt-2 space-y-1">{data.medicalHistory.versions.map((version, index) => <li key={version.id}>Version {data.medicalHistory.versions.length - index} · {when(version.createdAt)} · {version.recordedByName ?? "staff"}</li>)}</ol>
              </details>
            )}
            <h1 className="mt-1 text-2xl font-bold">{name}</h1>
            <p className="mt-1 text-sm capitalize text-violet-200">
              {patient.status} patient
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            [
              "Encounters",
              `/app/dentist/encounters?patientId=${patient.id}`,
              ClipboardList,
            ],
            [
              "Odontogram",
              `/app/dentist/odontogram?patientId=${patient.id}`,
              Grid3X3,
            ],
            ["Treatments", `#treatments`, Stethoscope],
          ].map(([label, href, Icon]) => (
            <Link
              key={String(label)}
              href={String(href)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
            >
              <Icon size={14} />
              {String(label)}
            </Link>
          ))}
        </div>
      </div>
      <section className="mt-7 grid gap-5 lg:grid-cols-3">
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
      <section
        id="medical-history"
        className="mt-7 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-start justify-between">
          <div>
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
          </div>
        </div>
        <HistoryEditor
          kind="medical"
          clinicId={clinicId}
          patientId={patient.id}
          current={data.medicalHistory.current}
        />
      </section>
      <section
        id="dental-history"
        className="mt-7 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6"
      >
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
            <ol className="mt-2 space-y-1">{data.dentalHistory.versions.map((version, index) => <li key={version.id}>Version {data.dentalHistory.versions.length - index} · {when(version.createdAt)} · {version.recordedByName ?? "staff"}</li>)}</ol>
          </details>
        )}
        <HistoryEditor
          kind="dental"
          clinicId={clinicId}
          patientId={patient.id}
          current={data.dentalHistory.current}
        />
      </section>
      <section id="treatments" className="mt-7 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Stethoscope className="text-violet-600" />Treatment history</h2>
        {treatments.length ? <div className="mt-5 divide-y divide-slate-100">{treatments.map((item) => <article key={item.id} className="grid gap-2 py-4 text-sm sm:grid-cols-4"><div><p className="font-bold text-slate-900">{item.serviceName ?? "Dental procedure"}</p><p className="text-xs text-slate-500">{item.performedAt ? when(item.performedAt) : "Date unavailable"}</p></div><p className="text-slate-600">Tooth/area: {item.toothRef ?? "General"}</p><p className="text-slate-600">{item.dentistFirstName ? `Dr. ${item.dentistFirstName} ${item.dentistLastName}` : "Dentist"}</p><Link href={`/app/dentist/encounters/${item.encounterId}`} className="font-semibold text-violet-600">Open encounter →</Link></article>)}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No treatment records.</p>}
      </section>
      <section
        id="appointments"
        className="mt-7 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <CalendarDays className="text-violet-600" />
              Appointment history
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Past and upcoming visits are kept in tenant scope.
            </p>
          </div>
          <Link
            href={`${basePath}/${patient.id}?appointmentSort=${sort === "asc" ? "desc" : "asc"}#appointments`}
            className="text-xs font-semibold text-violet-600"
          >
            Sort {sort === "asc" ? "newest" : "oldest"}
          </Link>
        </div>
        {data.appointments.length ? (
          <div className="mt-5 divide-y divide-slate-100">
            {data.appointments.map((item) => (
              <article
                key={item.id}
                className="grid gap-2 py-4 text-sm sm:grid-cols-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {when(item.startsAt)}
                  </p>
                  <p className="text-slate-500">{item.branchName}</p>
                </div>
                <p className="text-slate-700">
                  {item.serviceName ?? "Dental appointment"}
                </p>
                <p className="text-slate-700">
                  {item.dentistFirstName
                    ? `Dr. ${item.dentistFirstName} ${item.dentistLastName}`
                    : "Dentist unassigned"}
                </p>
                <span className="justify-self-start rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold capitalize text-violet-700">
                  {item.status.replace("_", " ")}
                </span>
                {item.encounterId && <Link href={`/app/dentist/encounters/${item.encounterId}`} className="text-xs font-semibold text-violet-600 sm:col-start-4">Open encounter →</Link>}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            No appointments recorded.
          </p>
        )}
      </section>
    </div>
  );
}
