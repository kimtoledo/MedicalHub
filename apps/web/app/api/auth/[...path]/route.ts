import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function handler(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const path = params.path.map(encodeURIComponent).join('/');
  return proxyToApi(request, `/v1/auth/${path}`);
}

export const GET = handler;
export const POST = handler;
