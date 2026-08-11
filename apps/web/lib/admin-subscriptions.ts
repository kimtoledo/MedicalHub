import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type AdminSubscriptionListResult = {
  items: Array<{ id: string; clinicId: string; clinicName: string; clinicSlug: string; packageId: string; packageName: string; packageSlug: string; status: SubscriptionStatus; startsAt: string; expiresAt: string | null; createdAt: string }>;
  packageOptions: Array<{ id: string; name: string }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
export async function getAdminSubscriptions(filters: { search: string; status?: SubscriptionStatus; packageId?: string; page: number }): Promise<AdminSubscriptionListResult> {
  const url = getBackendUrl('/v1/admin/subscriptions'); url.searchParams.set('page', String(filters.page));
  if (filters.search) url.searchParams.set('search', filters.search); if (filters.status) url.searchParams.set('status', filters.status); if (filters.packageId) url.searchParams.set('packageId', filters.packageId);
  const response = await fetch(url, { headers: { cookie: cookies().toString() }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Subscription list failed with status ${response.status}`);
  return ((await response.json()) as { data: AdminSubscriptionListResult }).data;
}
