import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxyToApi } from './api-proxy';

describe('proxyToApi origin handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes an allowed browser origin for the internal API hop', async () => {
    const fetchMock = vi.fn(async (_url: URL, init: RequestInit) => {
      expect(new Headers(init.headers).get('origin')).toBe('http://localhost:5001');
      return Response.json({ success: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest(
      'https://preview.example.test/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://preview.example.test',
          'x-forwarded-host': 'preview.example.test',
        },
        body: JSON.stringify({ email: 'admin@example.test', password: 'not-a-real-password' }),
      },
    );

    const response = await proxyToApi(request, '/v1/auth/sign-in/email');

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects a cross-origin browser request before calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest(
      'https://preview.example.test/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { origin: 'https://malicious.example.test' },
        body: '{}',
      },
    );

    const response = await proxyToApi(request, '/v1/auth/sign-in/email');

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});