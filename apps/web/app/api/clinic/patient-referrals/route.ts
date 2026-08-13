import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
export async function GET(request: NextRequest) { return proxyToApi(request, '/v1/clinic/patient-referrals'); }
export async function POST(request: NextRequest) { return proxyToApi(request, '/v1/clinic/patient-referrals'); }
