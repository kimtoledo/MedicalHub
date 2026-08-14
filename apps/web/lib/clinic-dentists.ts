import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';
export type ClinicDentistOption = { id: string; firstName: string; lastName: string; branchIds: string[] };
export async function getClinicDentists(clinicId: string): Promise<ClinicDentistOption[]> {
  const response = await fetch(getBackendUrl(`/v1/clinic/${encodeURIComponent(clinicId)}/dentists`), { headers: { cookie: cookies().toString() }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Clinic API failed with status ${response.status}`);
  return ((await response.json()) as { data: ClinicDentistOption[] }).data;
}
