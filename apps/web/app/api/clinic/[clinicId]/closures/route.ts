import type { NextRequest } from 'next/server'; import { proxyToApi } from '@/lib/api-proxy'; type Context = { params: { clinicId: string } };
export async function POST(request: NextRequest, context: Context) { return proxyToApi(request, `/v1/clinic/${encodeURIComponent(context.params.clinicId)}/closures`); }
