import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
type Context = { params: { encounterId: string } };
export async function POST(request: NextRequest, context: Context) { return proxyToApi(request, `/v1/clinic/encounters/${encodeURIComponent(context.params.encounterId)}/treatments`); }
