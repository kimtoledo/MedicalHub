import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBackendUrl } from './backend';

export async function proxyToApi(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse> {
  const url = getBackendUrl(pathname);
  url.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('host');

  const method = request.method.toUpperCase();
  const response = await fetch(url, {
    method,
    headers,
    body:
      method === 'GET' || method === 'HEAD'
        ? undefined
        : await request.arrayBuffer(),
    cache: 'no-store',
    redirect: 'manual',
  });

  const responseHeaders = new Headers();
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() !== 'set-cookie') {
      responseHeaders.set(name, value);
    }
  });

  const headersWithCookies = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = headersWithCookies.getSetCookie?.() ?? [];

  if (setCookies.length > 0) {
    setCookies.forEach((cookie) => responseHeaders.append('set-cookie', cookie));
  } else {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      responseHeaders.append('set-cookie', setCookie);
    }
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
