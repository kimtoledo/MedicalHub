import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
export async function GET(request: NextRequest, context: { params: { dentistId: string } }) { return proxyToApi(request, `/v1/public/dentists/${encodeURIComponent(context.params.dentistId)}/reviews`); }
