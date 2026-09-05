import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
type Context = { params: Promise<{ clinicSlug: string }> };
export async function GET(request: NextRequest, context: Context) { return proxyToApi(request, `/v1/public/clinics/${encodeURIComponent((await context.params).clinicSlug)}/availability`); }
