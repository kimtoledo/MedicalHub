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

export type AdminClinicPackageOption = {
  id: string;
  name: string;
  slug: string;
};

export type AdminClinicDetail = {
  id: string;
  name: string;
  slug: string;
  prefix: string;
  status: ClinicStatus;
  publicationStatus: 'draft' | 'published' | 'unpublished';
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    invitedAt: string | null;
    joinedAt: string | null;
  } | null;
  branches: Array<{
    id: string;
    name: string;
    isMain: boolean;
    isActive: boolean;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
  }>;
  subscription: {
    id: string;
    status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
    startsAt: string;
    expiresAt: string | null;
    package: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
    };
  } | null;
  featureOverrides: Array<{
    id: string;
    featureKey: string;
    isEnabled: boolean;
    reason: string;
    expiresAt: string | null;
    createdAt: string;
  }>;
  effectiveEntitlements: Array<{
    featureKey: string;
    isEnabled: boolean;
    source: 'package' | 'override';
    reason: string | null;
    expiresAt: string | null;
  }>;
  availableFeatureKeys: string[];
};

type AdminClinicPackageOptionsResponse = {
  success: true;
  data: AdminClinicPackageOption[];
};

type AdminClinicDetailResponse = {
  success: true;
  data: AdminClinicDetail;
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

export async function getAdminClinicPackageOptions(): Promise<
  AdminClinicPackageOption[]
> {
  const response = await fetch(
    getBackendUrl('/v1/admin/packages/options'),
    {
      headers: { cookie: cookies().toString() },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(
      `Clinic package options request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as AdminClinicPackageOptionsResponse;
  return payload.data;
}

export async function getAdminClinicDetail(
  clinicId: string,
): Promise<AdminClinicDetail | null> {
  const response = await fetch(
    getBackendUrl(`/v1/admin/clinics/${encodeURIComponent(clinicId)}`),
    {
      headers: { cookie: cookies().toString() },
      cache: 'no-store',
    },
  );

  if (response.status === 404 || response.status === 400) {
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `Clinic detail request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as AdminClinicDetailResponse;
  return payload.data;
}
