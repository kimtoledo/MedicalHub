import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

async function handler(request: NextRequest, { params }: { params: { path: string[] } }) {
  const pathname = '/v1/clinic/' + params.path.join('/');
  return proxyToApi(request, pathname);
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
