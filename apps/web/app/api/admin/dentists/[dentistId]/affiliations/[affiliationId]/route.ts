import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

type RouteContext = { params: { dentistId: string; affiliationId: string } };

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToApi(
    request,
    `/v1/admin/dentists/${encodeURIComponent(context.params.dentistId)}/affiliations/${encodeURIComponent(context.params.affiliationId)}`,
  );
}
