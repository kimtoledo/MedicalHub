import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

type RouteContext = {
  params: Promise<{ clinicId: string; membershipId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyToApi(
    request,
    `/v1/admin/clinics/${encodeURIComponent((await context.params).clinicId)}/staff/${encodeURIComponent((await context.params).membershipId)}`,
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToApi(
    request,
    `/v1/admin/clinics/${encodeURIComponent((await context.params).clinicId)}/staff/${encodeURIComponent((await context.params).membershipId)}`,
  );
}
