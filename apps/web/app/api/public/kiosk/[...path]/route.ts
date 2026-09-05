import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { const resolvedParams = await params; return proxyToApi(request, `/v1/public/kiosk/${resolvedParams.path.join('/')}`); }
export const GET = handler;
export const POST = handler;
