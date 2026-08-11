import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';
export type ClinicServiceOption = { id: string; name: string };
export type TreatmentRecord = { id: string; encounterId: string; patientId: string; serviceId: string | null; serviceName: string | null; toothRef: string | null; notes: string | null; performedBy: string | null; dentistFirstName: string | null; dentistLastName: string | null; performedAt: string | null; createdAt: string };
async function get<T>(path: string, clinicId: string): Promise<T> { const url = getBackendUrl(path); url.searchParams.set('clinicId', clinicId); const response = await fetch(url, { headers: { cookie: cookies().toString() }, cache: 'no-store' }); if (!response.ok) throw new Error(`Treatment API failed with ${response.status}`); return ((await response.json()) as { data: T }).data; }
export const getClinicServices = (clinicId: string) => get<ClinicServiceOption[]>('/v1/clinic/services', clinicId);
export const getPatientTreatments = (clinicId: string, patientId: string) => get<TreatmentRecord[]>(`/v1/clinic/patients/${encodeURIComponent(patientId)}/treatments`, clinicId);
