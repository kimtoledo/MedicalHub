import Link from "next/link";
import {
  CalendarClock,
  ClipboardList,
  History,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
} from "lucide-react";
import type { AppointmentDetail as AppointmentDetailData } from "@/lib/clinic-appointments";
import AppointmentActions from "@/components/app/dashboard/AppointmentActions";
import { statusStyle } from "@/components/app/dashboard/types";
import { canDentistManageAppointment, patientProfileHref } from "@/lib/dentist-schedule-navigation";

const show = (value: string | null | undefined) => value || "—";
const when = (value: string) =>
  new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));

export default function AppointmentDetail({
  clinicId,
  data,
  basePath,
  dentist = false,
  appointmentDentistId,
}: {
  clinicId: string;
  data: AppointmentDetailData;
  basePath: string;
  dentist?: boolean;
  appointmentDentistId?: string | null;
}) {
  const canManage = !dentist || canDentistManageAppointment(data.dentistId, appointmentDentistId);
  const patientHref = patientProfileHref(data.patientId, dentist);
  return (
    <div className="p-4 sm:p-8">
      <Link href={basePath} className="text-sm font-semibold text-violet-600">
        ← Back to appointments
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl bg-violet-950 p-6 text-white sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-700 text-lg font-bold">
            {data.patientFirstName[0]}
            {data.patientLastName[0]}
          </div>
          <div>
            <p className="font-mono text-xs text-violet-300">{data.patientNumber ?? "Public booking"}</p>
            {patientHref ? (
              <Link href={patientHref} className="mt-1 block text-2xl font-bold hover:underline">
                {data.patientLastName}, {data.patientFirstName}
              </Link>
            ) : (
              <h1 className="mt-1 text-2xl font-bold">{data.patientLastName}, {data.patientFirstName}</h1>
            )}
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyle(data.status)}`}>
              {data.status.replace("_", " ")}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="rounded-xl bg-white/10 p-3">
            <AppointmentActions clinicId={clinicId} appointmentId={data.id} status={data.status} />
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-violet-600">
            <CalendarClock size={16} />Visit details
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Date &amp; time</dt>
              <dd className="font-semibold text-slate-900">{when(data.startsAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Service</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-slate-900"><Stethoscope size={14} className="text-violet-500" />{show(data.serviceName)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Dentist</dt>
              <dd className="font-semibold text-slate-900">{data.dentistFirstName ? `Dr. ${data.dentistFirstName} ${data.dentistLastName}` : "Unassigned"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Branch</dt>
              <dd className="flex items-start gap-1.5 font-semibold text-slate-900"><MapPin size={14} className="mt-0.5 text-violet-500" />{data.branchName}
                {[data.branchAddress, data.branchCity, data.branchProvince].filter(Boolean).length > 0 && (
                  <span className="block text-xs font-normal text-slate-500">{[data.branchAddress, data.branchCity, data.branchProvince].filter(Boolean).join(", ")}</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-5 grid gap-4 border-t border-violet-100 pt-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Phone</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-slate-900"><Phone size={14} className="text-violet-500" />{show(data.patientPhone)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-slate-900"><Mail size={14} className="text-violet-500" />{show(data.patientEmail)}</dd>
            </div>
          </div>
          <div className="mt-5 border-t border-violet-100 pt-4">
            <p className="flex items-center gap-1.5 text-xs text-slate-500"><ClipboardList size={14} />Chief complaint</p>
            <p className="mt-1 text-sm text-slate-800">{show(data.chiefComplaint)}</p>
          </div>
          {data.notes && (
            <div className="mt-4">
              <p className="text-xs text-slate-500">Notes</p>
              <p className="mt-1 text-sm text-slate-800">{data.notes}</p>
            </div>
          )}
          {data.cancellationReason && (
            <div className="mt-4 rounded-xl bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700">Cancellation reason</p>
              <p className="mt-1 text-sm text-red-800">{data.cancellationReason}</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-violet-600">
            <History size={16} />Status history
          </h2>
          {data.statusHistory.length ? (
            <ol className="mt-4 space-y-4 border-l border-violet-100 pl-4">
              {data.statusHistory.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-violet-500" />
                  <p className="text-sm font-semibold capitalize text-slate-900">
                    {event.fromStatus ? `${event.fromStatus.replace("_", " ")} → ` : ""}{event.toStatus.replace("_", " ")}
                  </p>
                  <p className="text-xs text-slate-500">{when(event.createdAt)} · {event.changedByName ?? "System"}</p>
                  {event.reason && <p className="mt-1 text-xs text-slate-600">{event.reason}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No status changes recorded yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
