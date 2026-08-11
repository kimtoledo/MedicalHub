import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';

export type AdminAuditListResult = {
  items: Array<{
    id: string;
    actorId: string | null;
    actorEmail: string | null;
    clinicId: string | null;
    clinicName: string | null;
    entityType: string;
    entityId: string | null;
    action: string;
    metadata: string | null;
    ipAddress: string | null;
    occurredAt: string;
  }>;
  actionOptions: string[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function getAdminAudit(filters: {
  actor: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
}): Promise<AdminAuditListResult> {
  const url = getBackendUrl('/v1/admin/audit');
  url.searchParams.set('page', String(filters.page));
  if (filters.actor) url.searchParams.set('actor', filters.actor);
  if (filters.action) url.searchParams.set('action', filters.action);
  if (filters.dateFrom) url.searchParams.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) url.searchParams.set('dateTo', filters.dateTo);

  const response = await fetch(url, {
    headers: { cookie: cookies().toString() },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Audit list failed with status ${response.status}`);
  }
  return ((await response.json()) as { data: AdminAuditListResult }).data;
}
