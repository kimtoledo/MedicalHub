import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBackendUrl } from './backend';

export async function proxyToApi(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse> {
  const browserOrigin = request.headers.get('origin');
  const browserOriginHost = browserOrigin
    ? new URL(browserOrigin).host.toLowerCase()
    : null;
  const allowedHosts = [
    request.nextUrl.host,
    request.headers.get('host'),
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim(),
  ]
    .filter((host): host is string => Boolean(host))
    .map((host) => host.toLowerCase());

  if (browserOriginHost && !allowedHosts.includes(browserOriginHost)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Origin is not allowed' } },
      { status: 403 },
    );
  }

  const url = getBackendUrl(pathname);
  url.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('host');
  // Fastify and Better Auth validate this server-to-server hop against their
  // configured origin. The browser origin was validated above before replacing
  // a dynamic Replit preview/deployment hostname with that internal value.
  headers.set(
    'origin',
    process.env.CORS_ORIGINS?.split(',')[0]?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:5001',
  );

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
