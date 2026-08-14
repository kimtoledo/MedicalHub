import { notFound, redirect } from "next/navigation";
import EncounterForm from "@/components/app/encounters/EncounterForm";
import TreatmentPanel from "@/components/app/encounters/TreatmentPanel";
import FilesTab from "@/components/app/FilesTab";
import OdontogramChart from "@/components/app/odontogram/OdontogramChart";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";
import { getClinicPatientOptions } from "@/lib/clinic-patients";
import { getEncounter } from "@/lib/clinic-encounters";
import { getClinicServices, getPatientTreatments } from "@/lib/clinic-treatments";
import { getOdontogram } from "@/lib/clinic-odontogram";
import PrescriptionDrawer from "../../../prescriptions/new/PrescriptionDrawer";
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
  const canUseOdontogram = Boolean(context.entitlements["clinical.odontogram"]);
  const [services, patientTreatments, odontogram] = await Promise.all([
    getClinicServices(identity.clinicId),
    getPatientTreatments(identity.clinicId, encounter.patientId),
    canUseOdontogram ? getOdontogram(identity.clinicId, encounter.patientId).catch(() => null) : Promise.resolve(null),
  ]);
  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-violet-500">
          {encounter.patientNumber} · {encounter.branchName}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-violet-950">
          Encounter · {encounter.date}
        </h1>
        {encounter.status === "final" && context.entitlements["clinical.prescriptions"] ? (
          <div className="mt-4 flex justify-end">
            <PrescriptionDrawer clinicId={identity.clinicId} encounterId={encounter.id} />
          </div>
        ) : null}
        <div className="mt-7 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
          <EncounterForm
            clinicId={identity.clinicId}
            branches={context.branches}
            patients={patientData.items}
            encounter={encounter}
          />
        </div>
        <TreatmentPanel clinicId={identity.clinicId} encounterId={encounter.id} isFinal={encounter.status === "final"} services={services} treatments={patientTreatments.filter((item) => item.encounterId === encounter.id)} />
        {canUseOdontogram ? (
          <section className="mt-6">
            <h2 className="mb-4 text-lg font-bold text-violet-950">Odontogram</h2>
            <OdontogramChart
              clinicId={identity.clinicId}
              patientId={encounter.patientId}
              initial={odontogram ?? { events: [], currentState: [] }}
              encounterId={encounter.id}
              dentistId={encounter.dentistId ?? undefined}
              readOnly={encounter.status === "final"}
            />
          </section>
        ) : null}
        {context.entitlements["clinical.radiographs"] ? (
          <section className="mt-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="mb-4 text-lg font-bold text-violet-950">Clinical Files</h2>
            <FilesTab
              clinicId={identity.clinicId}
              encounterId={encounter.id}
              patientId={encounter.patientId}
              branchId={encounter.branchId}
              allowUpload={encounter.status !== "final"}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
