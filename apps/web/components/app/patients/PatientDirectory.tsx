import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import type { PatientListItem } from "@/lib/clinic-patients";
import NewPatientDrawer from "./NewPatientDrawer";
function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila",
      }).format(new Date(value))
    : "—";
}
export default function PatientDirectory({
  clinicId,
  data,
  search,
  basePath = "/app/patients",
  registrationVariant = "drawer",
}: {
  clinicId: string;
  data: {
    items: PatientListItem[];
    pagination: { page: number; total: number; totalPages: number };
  };
  search: string;
  basePath?: string;
  registrationVariant?: "drawer" | "modal";
}) {
  const href = (page: number) =>
    `${basePath}?${new URLSearchParams({ ...(search ? { search } : {}), page: String(page) })}`;
  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-violet-500">
            Clinic records
          </p>
          <h1 className="mt-1 text-3xl font-bold text-violet-950">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.pagination.total} tenant-scoped patient records
          </p>
        </div>
        <NewPatientDrawer clinicId={clinicId} variant={registrationVariant} basePath={basePath} />
      </div>
      <form className="mt-7 flex max-w-xl gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search patients</span>
          <Search size={17} className="absolute left-3 top-3 text-slate-400" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search name, patient number, or mobile"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm"
          />
        </label>
        <button className="rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700">
          Search
        </button>
      </form>
      <div className="mt-6 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
        {data.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wide text-violet-700">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Mobile</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last appointment</th>
                  <th className="px-5 py-3">Next appointment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((patient) => (
                  <tr key={patient.id} className="hover:bg-violet-50/40">
                    <td className="px-5 py-4">
                      <Link
                        href={`${basePath}/${patient.id}`}
                        className="font-bold text-slate-900 hover:text-violet-700"
                      >
                        {patient.lastName}, {patient.firstName}
                      </Link>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {patient.patientNumber}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {patient.phone ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {date(patient.lastAppointment)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {date(patient.nextAppointment)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <Users className="mx-auto text-slate-300" size={36} />
            <p className="mt-3 font-semibold text-slate-700">
              No patients found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Adjust the search or register the first patient.
            </p>
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {data.pagination.page} of {data.pagination.totalPages}
        </span>
        <div className="flex gap-2">
          {data.pagination.page > 1 && (
            <Link
              href={href(data.pagination.page - 1)}
              className="rounded-lg border bg-white p-2"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </Link>
          )}
          {data.pagination.page < data.pagination.totalPages && (
            <Link
              href={href(data.pagination.page + 1)}
              className="rounded-lg border bg-white p-2"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
