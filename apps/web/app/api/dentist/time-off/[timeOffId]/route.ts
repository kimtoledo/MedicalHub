import type { NextRequest } from 'next/server'; import { proxyToApi } from '@/lib/api-proxy'; type Context = { params: Promise<{ timeOffId: string }> };
export async function DELETE(request: NextRequest, context: Context) { return proxyToApi(request, `/v1/dentist/time-off/${encodeURIComponent((await context.params).timeOffId)}`); }
