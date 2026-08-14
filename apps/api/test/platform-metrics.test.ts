import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { PlatformOperationsService } from '../src/platform/operations-service.js';
import { createMetricsService } from '../src/platform/metrics-service.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };

function adminContext(): AuthorizationContext { return { user: { id: '66666666-6666-4666-8666-666666666666', email: 'admin@example.test', name: 'Admin', platformRole: 'super_admin' }, strategies: ['superAdmin'], clinicMemberships: [] }; }
function auth(value: AuthorizationContext): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value) }; }
function operations(): PlatformOperationsService { return { requestSupportAccess: vi.fn(), listSupportAccess: vi.fn(async () => []), reviewSupportAccess: vi.fn(), requestExport: vi.fn(), listExports: vi.fn(async () => []), markExport: vi.fn(), generateExport: vi.fn(), downloadUrl: vi.fn(), streamExport: vi.fn(async () => null), activeClinics: vi.fn(async () => []) } as unknown as PlatformOperationsService; }

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });

describe('request metrics', () => {
  it('counts real requests by status code and exposes them to a Super Admin', async () => {
    const metrics = createMetricsService();
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(adminContext()), platformOperations: operations(), metrics });

    // A couple of ordinary requests, including one that 404s.
    await app.inject({ method: 'GET', url: '/v1/admin/operations/clinics', headers: { cookie: 'session=test' } });
    await app.inject({ method: 'GET', url: '/v1/this-route-does-not-exist' });

    const response = await app.inject({ method: 'GET', url: '/v1/admin/operations/metrics', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    const data = response.json().data;
    // onResponse fires after a response is already sent, so this metrics
    // call itself isn't counted in its own response body — only the 2 prior requests are.
    expect(data.totalRequests).toBeGreaterThanOrEqual(2);
    expect(data.clientErrorCount).toBeGreaterThanOrEqual(1); // the 404
    expect(typeof data.errorRatePercent).toBe('number');
  });

  it('denies clinic staff from the metrics endpoint', async () => {
    const metrics = createMetricsService();
    const clinicContext: AuthorizationContext = { user: { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test', name: 'Staff', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [] };
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(clinicContext), platformOperations: operations(), metrics });
    const response = await app.inject({ method: 'GET', url: '/v1/admin/operations/metrics', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
  });

  it('is absent entirely when no metrics service is provided', async () => {
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(adminContext()), platformOperations: operations() });
    const response = await app.inject({ method: 'GET', url: '/v1/admin/operations/metrics', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(404);
  });
});
