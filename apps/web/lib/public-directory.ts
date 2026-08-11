import 'server-only';
import { getBackendUrl } from './backend';
export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
export type PublicClinic = { id: string; name: string; slug: string; description: string | null; logoUrl: string | null; city: string | null; province: string | null; locations: string[]; services: string[] };
export type PublicDentist = { id: string; firstName: string; lastName: string; slug: string; specialty: string | null; bio: string | null; photoUrl: string | null; affiliatedClinicCount: number };
async function publicGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> { const url = getBackendUrl(path); Object.entries(params ?? {}).forEach(([key, value]) => { if (value !== undefined && value !== '') url.searchParams.set(key, String(value)); }); const response = await fetch(url, { next: { revalidate: 60 } }); if (!response.ok) throw new Error(`Public request failed with status ${response.status}`); return ((await response.json()) as { data: T }).data; }
export const getPublicClinics = (filters: { search: string; location: string; service: string; page: number }) => publicGet<{ items: PublicClinic[]; pagination: Pagination }>('/v1/public/clinics', filters);
export const getPublicDentists = (filters: { search: string; specialty: string; page: number }) => publicGet<{ items: PublicDentist[]; pagination: Pagination }>('/v1/public/dentists', filters);
export const getPublicSummary = () => publicGet<{ publishedClinicCount: number; publishedDentistCount: number }>('/v1/public/summary');
