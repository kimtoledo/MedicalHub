import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
export async function POST(request: NextRequest, context: { params: Promise<{ referralId: string }> }) { return proxyToApi(request, `/v1/clinic/patient-referrals/${(await context.params).referralId}/accept`); }
