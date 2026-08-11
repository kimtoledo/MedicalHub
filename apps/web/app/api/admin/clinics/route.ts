import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

export async function POST(request: NextRequest) {
  return proxyToApi(request, '/v1/admin/clinics');
}
