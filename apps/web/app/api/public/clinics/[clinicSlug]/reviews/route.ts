import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

export async function GET(request: NextRequest, context: { params: Promise<{ clinicSlug: string }> }) {
  return proxyToApi(request, `/v1/public/clinics/${encodeURIComponent((await context.params).clinicSlug)}/reviews`);
}
