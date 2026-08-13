import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
async function handler(request: NextRequest, context: { params: { path?: string[] } }) { return proxyToApi(request, `/v1/admin/reviews${context.params.path?.length ? `/${context.params.path.join('/')}` : ''}`); }
export const GET = handler;
export const PATCH = handler;
