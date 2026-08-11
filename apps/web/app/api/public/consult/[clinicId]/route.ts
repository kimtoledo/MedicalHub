import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

/**
 * Proxies public consult submission to the API.
 * No authentication required — multipart form is forwarded as-is.
 */
async function handler(request: NextRequest, { params }: { params: { clinicId: string } }) {
  return proxyToApi(request, `/v1/public/consult/${params.clinicId}`);
}

export const POST = handler;
