import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

type RouteContext = { params: Promise<{ dentistId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToApi(
    request,
    `/v1/admin/dentists/${encodeURIComponent((await context.params).dentistId)}/affiliations`,
  );
}
