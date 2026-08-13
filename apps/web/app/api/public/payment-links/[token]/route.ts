import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  return proxyToApi(request, `/v1/public/payment-links/${params.token}`);
}
