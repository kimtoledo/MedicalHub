import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
type RouteContext = { params: { dentistId: string } };
export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyToApi(request, `/v1/admin/dentists/${encodeURIComponent(context.params.dentistId)}/publication`);
}
