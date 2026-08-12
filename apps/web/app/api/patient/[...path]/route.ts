import type { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';
type Context = { params: { path: string[] } };
export async function GET(request: NextRequest, context: Context) { return proxyToApi(request, `/v1/patient/${context.params.path.map(encodeURIComponent).join('/')}`); }
export async function POST(request: NextRequest, context: Context) { return proxyToApi(request, `/v1/patient/${context.params.path.map(encodeURIComponent).join('/')}`); }
