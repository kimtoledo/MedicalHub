import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

async function handler(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  return proxyToApi(request, `/v1/admin/settings${params.path?.length ? `/${params.path.join('/')}` : ''}`);
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
