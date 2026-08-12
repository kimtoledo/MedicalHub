import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
async function handler(request: NextRequest, { params }: { params: { path: string[] } }) { return proxyToApi(request, `/v1/public/kiosk/${params.path.join('/')}`); }
export const GET = handler;
export const POST = handler;
