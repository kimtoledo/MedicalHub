import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';

export type ClinicStatus = 'trial' | 'active' | 'suspended' | 'archived';

export type AdminClinicListItem = {
  id: string;
  name: string;
  slug: string;
  prefix: string;
  status: ClinicStatus;
  publicationStatus: 'draft' | 'published' | 'unpublished';
  packageName: string | null;
  branchCount: number;
  createdAt: string;
};

export type AdminClinicListResult = {
  items: AdminClinicListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminClinicListResponse = {
  success: true;
  data: AdminClinicListResult;
};

export async function getAdminClinics(filters: {
  search: string;
  status?: ClinicStatus;
  page: number;
  pageSize?: number;
}): Promise<AdminClinicListResult> {
  const url = getBackendUrl('/v1/admin/clinics');
  url.searchParams.set('page', String(filters.page));
  url.searchParams.set('pageSize', String(filters.pageSize ?? 10));
  if (filters.search) {
    url.searchParams.set('search', filters.search);
  }
  if (filters.status) {
    url.searchParams.set('status', filters.status);
  }

  const response = await fetch(url, {
    headers: { cookie: cookies().toString() },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Clinic list request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as AdminClinicListResponse;
  return payload.data;
}
