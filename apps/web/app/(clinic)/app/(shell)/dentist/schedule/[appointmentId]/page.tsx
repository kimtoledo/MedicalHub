import { notFound, redirect } from "next/navigation";
import AppointmentDetail from "@/components/app/appointments/AppointmentDetail";
import { getClinicAppointment } from "@/lib/clinic-appointments";
import { getClinicSession } from "@/lib/clinic-session";

export default async function DentistAppointmentPage({ params }: { params: { appointmentId: string } }) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  const data = await getClinicAppointment(identity.clinicId, params.appointmentId).catch(() => null);
  if (!data) notFound();
  return (
    <AppointmentDetail
      clinicId={identity.clinicId}
      data={data}
      basePath="/app/dentist/schedule"
      dentist
      appointmentDentistId={identity.dentistId}
    />
  );
}
