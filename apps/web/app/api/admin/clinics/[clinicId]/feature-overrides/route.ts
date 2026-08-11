import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

type RouteContext = { params: { clinicId: string } };

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToApi(
    request,
    `/v1/admin/clinics/${encodeURIComponent(context.params.clinicId)}/feature-overrides`,
  );
}
