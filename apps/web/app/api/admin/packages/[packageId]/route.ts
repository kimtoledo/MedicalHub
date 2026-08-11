import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
type RouteContext = { params: { packageId: string } };
export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyToApi(request, `/v1/admin/packages/${encodeURIComponent(context.params.packageId)}`);
}
