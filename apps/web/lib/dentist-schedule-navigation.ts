export function patientProfileHref(patientId: string | null, dentistView: boolean) {
  if (!patientId) return null;
  return `${dentistView ? "/app/dentist/patients" : "/app/patients"}/${patientId}`;
}

export function appointmentDetailHref(appointmentId: string, dentistView: boolean) {
  return `${dentistView ? "/app/dentist/schedule" : "/app/appointments"}/${appointmentId}`;
}

export function canDentistManageAppointment(
  appointmentDentistId: string | null,
  currentDentistId: string | null | undefined,
) {
  return Boolean(currentDentistId && appointmentDentistId === currentDentistId);
}
