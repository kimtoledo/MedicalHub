import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ appointmentId: string }> }
) {
  const params = await props.params;
  return proxyToApi(
    request,
    `/v1/clinic/appointments/${encodeURIComponent(params.appointmentId)}/quick-complete`,
  );
}
