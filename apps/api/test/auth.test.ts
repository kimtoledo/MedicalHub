import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 3001,
  logLevel: 'silent',
  corsOrigins: ['http://localhost:3000'],
  authSecret: 'test-secret-that-is-at-least-32-characters',
  authBaseUrl: 'http://localhost:3001',
};

const superAdminContext: AuthorizationContext = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@dentra.ph',
    name: 'Dentra Admin',
    platformRole: 'super_admin',
  },
  strategies: ['superAdmin'],
  clinicMemberships: [],
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function createAuth(overrides: Partial<AuthServices> = {}): AuthServices {
  return {
    handler: vi.fn(async () => new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })),
    getSession: vi.fn(async () => null),
    resolveAuthorization: vi.fn(async () => null),
    ...overrides,
  };
}

async function createApp(auth: AuthServices) {
  app = await buildApp({
    config,
    checkDatabase: async () => undefined,
    logger: false,
    auth,
  });
}

describe('Better Auth routes', () => {
  it('forwards versioned auth requests to Better Auth', async () => {
    const handler = vi.fn(async (request: Request) =>
      new Response(JSON.stringify({ token: 'not-a-real-token' }), {
        status: 201,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'dentra.session=fake; HttpOnly; SameSite=Lax',
        },
      }));
    await createApp(createAuth({ handler }));

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/auth/sign-in/email',
      payload: { email: 'admin@dentra.ph', password: 'not-a-real-password' },
    });

    expect(response.statusCode).toBe(201);
    expect(String(response.headers['set-cookie'])).toContain('HttpOnly');
    expect(handler).toHaveBeenCalledOnce();
    const request = handler.mock.calls[0]?.[0];
    expect(request?.url).toBe('http://localhost:3001/v1/auth/sign-in/email');
  });

  it('rejects session context without a valid session', async () => {
    await createApp(createAuth());

    const response = await app!.inject({ method: 'GET', url: '/v1/session-context' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'A valid session is required',
      },
    });
  });

  it('returns role data resolved by the backend, not the request', async () => {
    const resolveAuthorization = vi.fn(async () => superAdminContext);
    await createApp(createAuth({
      getSession: vi.fn(async () => ({
        session: {
          id: '22222222-2222-4222-8222-222222222222',
          userId: superAdminContext.user.id,
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        },
        user: superAdminContext.user,
      })),
      resolveAuthorization,
    }));

    const response = await app!.inject({
      method: 'GET',
      url: '/v1/session-context',
      headers: { cookie: 'dentra.session=fake' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true, data: superAdminContext });
    expect(resolveAuthorization).toHaveBeenCalledWith(superAdminContext.user.id);
  });

  it('rejects a session whose user is inactive or deleted', async () => {
    await createApp(createAuth({
      getSession: vi.fn(async () => ({
        session: {
          id: '22222222-2222-4222-8222-222222222222',
          userId: superAdminContext.user.id,
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        },
        user: superAdminContext.user,
      })),
      resolveAuthorization: vi.fn(async () => null),
    }));

    const response = await app!.inject({ method: 'GET', url: '/v1/session-context' });

    expect(response.statusCode).toBe(401);
  });
});
