import { redirect } from "next/navigation";
import EncounterForm from "@/components/app/encounters/EncounterForm";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";
import { getClinicPatientOptions } from "@/lib/clinic-patients";
export default async function NewEncounterPage({
  searchParams,
}: {
  searchParams: { patientId?: string; appointmentId?: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  const [context, patientData] = await Promise.all([
    getClinicShellContext(identity),
    getClinicPatientOptions(identity.clinicId),
  ]);
  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-violet-500">
          Clinical documentation
        </p>
        <h1 className="mt-1 text-3xl font-bold text-violet-950">
          New encounter
        </h1>
        <div className="mt-7 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
          <EncounterForm
            clinicId={identity.clinicId}
            branches={context.branches}
            patients={patientData.items}
            initialPatientId={searchParams.patientId}
            initialAppointmentId={searchParams.appointmentId}
          />
        </div>
      </div>
    </div>
  );
}
