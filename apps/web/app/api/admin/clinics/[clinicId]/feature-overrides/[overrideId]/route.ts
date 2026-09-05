import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

type RouteContext = { params: Promise<{ clinicId: string; overrideId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToApi(
    request,
    `/v1/admin/clinics/${encodeURIComponent((await context.params).clinicId)}/feature-overrides/${encodeURIComponent((await context.params).overrideId)}`,
  );
}
