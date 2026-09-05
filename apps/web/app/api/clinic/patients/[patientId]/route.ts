import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
type Context = { params: Promise<{ patientId: string }> };
export async function GET(request: NextRequest, context: Context) { return proxyToApi(request, `/v1/clinic/patients/${encodeURIComponent((await context.params).patientId)}`); }
