import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { getClinicSession } from "@/lib/clinic-session";
import { getEncounters } from "@/lib/clinic-encounters";
const when = (value: string) =>
  new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00+08:00`),
  );
export default async function EncountersPage({
  searchParams,
}: {
  searchParams: { patientId?: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  const rows = await getEncounters(
    identity.clinicId,
    searchParams.patientId,
    identity.role === "dentist" ? (identity.dentistId ?? undefined) : undefined,
  );
  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-violet-500">
            Clinical records
          </p>
          <h1 className="mt-1 text-3xl font-bold text-violet-950">
            Encounters
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} visit record(s)
          </p>
        </div>
        <Link
          href={`/app/dentist/encounters/new${searchParams.patientId ? `?patientId=${searchParams.patientId}` : ""}`}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          <FilePlus2 size={17} />
          New encounter
        </Link>
      </div>
      <div className="mt-7 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <Link
              key={row.id}
              href={`/app/dentist/encounters/${row.id}`}
              className="grid gap-3 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm hover:border-violet-300 sm:grid-cols-4"
            >
              <div>
                <p className="font-bold text-slate-900">
                  {row.patientLastName}, {row.patientFirstName}
                </p>
                <p className="font-mono text-xs text-slate-500">
                  {row.patientNumber}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {when(row.date)}
                </p>
                <p className="text-xs text-slate-500">{row.branchName}</p>
              </div>
              <p className="line-clamp-2 text-sm text-slate-600">
                {row.chiefComplaint ?? "No chief complaint recorded"}
              </p>
              <span
                className={`justify-self-start rounded-full px-2.5 py-1 text-xs font-bold capitalize ${row.status === "final" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
              >
                {row.status}
              </span>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            No encounters found.
          </div>
        )}
      </div>
    </div>
  );
}
