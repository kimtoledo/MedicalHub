import { notFound, redirect } from "next/navigation";
import EncounterForm from "@/components/app/encounters/EncounterForm";
import TreatmentPanel from "@/components/app/encounters/TreatmentPanel";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";
import { getClinicPatientOptions } from "@/lib/clinic-patients";
import { getEncounter } from "@/lib/clinic-encounters";
import { getClinicServices, getPatientTreatments } from "@/lib/clinic-treatments";
export default async function EncounterPage({
  params,
}: {
  params: { encounterId: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  const [context, patientData, encounter] = await Promise.all([
    getClinicShellContext(identity),
    getClinicPatientOptions(identity.clinicId),
    getEncounter(identity.clinicId, params.encounterId).catch(() => null),
  ]);
  if (!encounter) notFound();
  const [services, patientTreatments] = await Promise.all([getClinicServices(identity.clinicId), getPatientTreatments(identity.clinicId, encounter.patientId)]);
  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-violet-500">
          {encounter.patientNumber} · {encounter.branchName}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-violet-950">
          Encounter · {encounter.date}
        </h1>
        <div className="mt-7 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
          <EncounterForm
            clinicId={identity.clinicId}
            branches={context.branches}
            patients={patientData.items}
            encounter={encounter}
          />
        </div>
        <TreatmentPanel clinicId={identity.clinicId} encounterId={encounter.id} isFinal={encounter.status === "final"} services={services} treatments={patientTreatments.filter((item) => item.encounterId === encounter.id)} />
      </div>
    </div>
  );
}
