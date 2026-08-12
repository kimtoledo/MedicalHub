import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';

export type AdminDashboardData = {
  metrics: { totalClinics: number; currentSubscriptions: number; totalDentists: number; totalAppointments: number; appointmentsLast30Days: number };
  clinicStatuses: Record<'active' | 'trial' | 'suspended' | 'archived', number>;
  subscriptionStatuses: Record<'active' | 'trial' | 'past_due', number>;
  recentActivity: Array<{ id: string; action: string; entityType: string; clinicName: string | null; occurredAt: string }>;
};
export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const response = await fetch(getBackendUrl('/v1/admin/dashboard'), { headers: { cookie: cookies().toString() }, cache: 'no-store' });
  if (!response.ok) throw new Error('Admin dashboard is unavailable');
  return ((await response.json()) as { data: AdminDashboardData }).data;
}
