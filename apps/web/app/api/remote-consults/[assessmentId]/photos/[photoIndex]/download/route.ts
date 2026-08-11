import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

/**
 * Proxies signed photo download requests for remote assessments.
 * Token validation happens in the API layer.
 */
async function handler(
  request: NextRequest,
  { params }: { params: { assessmentId: string; photoIndex: string } },
) {
  const search = request.nextUrl.searchParams.toString();
  const path = `/v1/remote-consults/${params.assessmentId}/photos/${params.photoIndex}/download${search ? '?' + search : ''}`;
  return proxyToApi(request, path);
}

export const GET = handler;
