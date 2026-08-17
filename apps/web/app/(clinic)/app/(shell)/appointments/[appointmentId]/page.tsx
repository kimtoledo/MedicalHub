import { notFound, redirect } from "next/navigation";
import AppointmentDetail from "@/components/app/appointments/AppointmentDetail";
import { getClinicAppointment } from "@/lib/clinic-appointments";
import { getClinicSession } from "@/lib/clinic-session";
import { getEncounters } from "@/lib/clinic-encounters";

export default async function AppointmentPage({ params }: { params: { appointmentId: string } }) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  const data = await getClinicAppointment(identity.clinicId, params.appointmentId).catch(() => null);
  if (!data) notFound();
  const encounters = data.patientId
    ? await getEncounters(identity.clinicId, data.patientId).catch(() => [])
    : [];
  const linkedEncounter = encounters.find((item) => item.appointmentId === data.id) ?? null;
  return (
    <AppointmentDetail
      clinicId={identity.clinicId}
      data={data}
      basePath="/app/appointments"
      encounterBasePath="/app/encounters"
      linkedEncounter={linkedEncounter}
      canCompleteQuickService={identity.isAdmin}
    />
  );
}
