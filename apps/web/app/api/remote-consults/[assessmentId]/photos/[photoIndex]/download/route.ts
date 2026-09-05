import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

/**
 * Proxies signed photo download requests for remote assessments.
 * Token validation happens in the API layer.
 */
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string; photoIndex: string }> },
) {
  const resolvedParams = await params;
  const search = request.nextUrl.searchParams.toString();
  const path = `/v1/remote-consults/${resolvedParams.assessmentId}/photos/${resolvedParams.photoIndex}/download${search ? '?' + search : ''}`;
  return proxyToApi(request, path);
}

export const GET = handler;
