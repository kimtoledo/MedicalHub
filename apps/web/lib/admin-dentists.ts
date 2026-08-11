import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';

export type DentistVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified';

export type AdminDentistListItem = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  licenseNumber: string | null;
  specialty: string | null;
  verificationStatus: DentistVerificationStatus;
  publicationStatus: string;
  affiliatedClinicCount: number;
  createdAt: string;
};

export type AdminDentistListResult = {
  items: AdminDentistListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminDentistListResponse = {
  success: true;
  data: AdminDentistListResult;
};

export type AdminDentistDetail = Omit<AdminDentistListItem, 'affiliatedClinicCount'> & {
  bio: string | null;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  updatedAt: string;
  affiliations: Array<{
    id: string;
    clinicId: string;
    clinicName: string;
    branchId: string;
    branchName: string;
  }>;
  availableBranches: Array<{
    clinicId: string;
    clinicName: string;
    branchId: string;
    branchName: string;
  }>;
};

type AdminDentistDetailResponse = {
  success: true;
  data: AdminDentistDetail;
};

export async function getAdminDentists(filters: {
  search: string;
  verificationStatus?: DentistVerificationStatus;
  page: number;
  pageSize?: number;
}): Promise<AdminDentistListResult> {
  const url = getBackendUrl('/v1/admin/dentists');
  url.searchParams.set('page', String(filters.page));
  url.searchParams.set('pageSize', String(filters.pageSize ?? 10));
  if (filters.search) {
    url.searchParams.set('search', filters.search);
  }
  if (filters.verificationStatus) {
    url.searchParams.set('verificationStatus', filters.verificationStatus);
  }

  const response = await fetch(url, {
    headers: { cookie: cookies().toString() },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Dentist list request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as AdminDentistListResponse;
  return payload.data;
}

export async function getAdminDentistDetail(
  dentistId: string,
): Promise<AdminDentistDetail | null> {
  const response = await fetch(
    getBackendUrl(`/v1/admin/dentists/${encodeURIComponent(dentistId)}`),
    {
      headers: { cookie: cookies().toString() },
      cache: 'no-store',
    },
  );
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Dentist detail request failed with status ${response.status}`);
  }
  const payload = (await response.json()) as AdminDentistDetailResponse;
  return payload.data;
}
