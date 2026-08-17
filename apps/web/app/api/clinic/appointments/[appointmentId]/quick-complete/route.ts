import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: { appointmentId: string } },
) {
  return proxyToApi(
    request,
    `/v1/clinic/appointments/${encodeURIComponent(params.appointmentId)}/quick-complete`,
  );
}
