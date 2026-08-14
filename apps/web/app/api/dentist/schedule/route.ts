import type { NextRequest } from 'next/server'; import { proxyToApi } from '@/lib/api-proxy';
export async function GET(request: NextRequest) { return proxyToApi(request, '/v1/dentist/schedule'); }
export async function PUT(request: NextRequest) { return proxyToApi(request, '/v1/dentist/schedule'); }
