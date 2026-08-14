export function patientProfileHref(patientId: string | null, dentistView: boolean) {
  if (!patientId) return null;
  return `${dentistView ? "/app/dentist/patients" : "/app/patients"}/${patientId}`;
}

export function canDentistManageAppointment(
  appointmentDentistId: string | null,
  currentDentistId: string | null | undefined,
) {
  return Boolean(currentDentistId && appointmentDentistId === currentDentistId);
}
