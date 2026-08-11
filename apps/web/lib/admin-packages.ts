import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';

export type AdminPackageItem = {
  id: string; name: string; slug: string; description: string | null;
  priceDisplay: string; isActive: boolean; sortOrder: string | null;
  featureKeys: string[]; activeClinicCount: number;
};
export type AdminPackageListResult = { items: AdminPackageItem[]; featureCatalog: string[] };

export async function getAdminPackages(): Promise<AdminPackageListResult> {
  const response = await fetch(getBackendUrl('/v1/admin/packages'), {
    headers: { cookie: cookies().toString() }, cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Package list request failed with status ${response.status}`);
  const payload = await response.json() as { success: true; data: AdminPackageListResult };
  return payload.data;
}
