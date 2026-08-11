import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

type RouteContext = {
  params: {
    path: string[];
  };
};

async function handler(request: NextRequest, context: RouteContext) {
  const path = context.params.path.map(encodeURIComponent).join('/');
  return proxyToApi(request, `/v1/auth/${path}`);
}

export const GET = handler;
export const POST = handler;
