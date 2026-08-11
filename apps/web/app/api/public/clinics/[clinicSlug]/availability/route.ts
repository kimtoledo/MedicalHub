import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
type Context = { params: { clinicSlug: string } };
export async function GET(request: NextRequest, context: Context) { return proxyToApi(request, `/v1/public/clinics/${encodeURIComponent(context.params.clinicSlug)}/availability`); }
