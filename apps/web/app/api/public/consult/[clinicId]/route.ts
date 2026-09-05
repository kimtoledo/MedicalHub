import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

/**
 * Proxies public consult submission to the API.
 * No authentication required — multipart form is forwarded as-is.
 */
async function handler(request: NextRequest, { params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  return proxyToApi(request, `/v1/public/consult/${clinicId}`);
}

export const POST = handler;
