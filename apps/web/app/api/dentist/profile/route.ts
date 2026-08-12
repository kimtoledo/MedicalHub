import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/api-proxy';

const handler = (request: NextRequest) => proxyToApi(request, '/v1/dentist/profile');
export const GET = handler;
export const PATCH = handler;
