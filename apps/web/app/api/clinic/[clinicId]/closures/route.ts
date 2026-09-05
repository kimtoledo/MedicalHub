import type { NextRequest } from 'next/server'; import { proxyToApi } from '@/lib/api-proxy'; type Context = { params: Promise<{ clinicId: string }> };
export async function POST(request: NextRequest, context: Context) { return proxyToApi(request, `/v1/clinic/${encodeURIComponent((await context.params).clinicId)}/closures`); }
