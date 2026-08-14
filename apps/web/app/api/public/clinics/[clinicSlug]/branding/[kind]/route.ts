import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

// Path segment is named `clinicSlug` to match its sibling routes (Next.js
// requires the same dynamic segment name at a given path level) — the value
// passed through this segment is actually the clinic's id, matching what
// `brandingImageUrl` in lib/clinic-branding.ts builds the URL with.
type Context = { params: { clinicSlug: string; kind: string } };

export async function GET(request: NextRequest, { params }: Context) {
  return proxyToApi(
    request,
    `/v1/public/clinics/${encodeURIComponent(params.clinicSlug)}/branding/${encodeURIComponent(params.kind)}`,
  );
}
