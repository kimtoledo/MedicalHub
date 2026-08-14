import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../src/auth/types.js';
import type { PlatformSettingsService } from '../src/admin/platform-settings-service.js';
import { PlatformSettingsError } from '../src/admin/platform-settings-service.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';

function clinicContext(role: ClinicRole): AuthorizationContext { return { user: { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test', name: 'Staff', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role, dentistId: null }] }; }
function adminContext(): AuthorizationContext { return { user: { id: '66666666-6666-4666-8666-666666666666', email: 'admin@example.test', name: 'Admin', platformRole: 'super_admin' }, strategies: ['superAdmin'], clinicMemberships: [] }; }
function auth(value: AuthorizationContext, extras: Partial<AuthServices> = {}): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value), ...extras }; }
function settingsService(overrides: Partial<PlatformSettingsService> = {}): PlatformSettingsService {
  return {
    get: vi.fn(async () => ({ id: 'row-1', supportEmail: null, supportPhone: null, maintenanceBannerEnabled: false, maintenanceBannerMessage: null, updatedBy: null, createdAt: new Date(), updatedAt: new Date() })),
    update: vi.fn(async () => ({ id: 'row-1', supportEmail: 'help@dentra.ph', supportPhone: null, maintenanceBannerEnabled: false, maintenanceBannerMessage: null, updatedBy: 'admin', createdAt: new Date(), updatedAt: new Date() })),
    runtimeSummary: vi.fn(async () => ({ nodeEnv: 'test', appVersion: '0.1.0', uptimeSeconds: 10, serverTimeUtc: new Date().toISOString(), databaseConnected: true })),
    ...overrides,
  } as unknown as PlatformSettingsService;
}

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(context: AuthorizationContext, service: PlatformSettingsService, authExtras: Partial<AuthServices> = {}) { app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context, authExtras), adminSettings: service }); }

describe('super admin platform settings routes', () => {
  it('returns a read-only runtime summary to a Super Admin', async () => {
    const service = settingsService();
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/settings/runtime', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.databaseConnected).toBe(true);
    expect(service.runtimeSummary).toHaveBeenCalled();
  });

  it('denies clinic staff from the runtime summary', async () => {
    const service = settingsService();
    await setup(clinicContext('clinic_owner'), service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/settings/runtime', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(service.runtimeSummary).not.toHaveBeenCalled();
  });

  it('lets a Super Admin view platform settings', async () => {
    const service = settingsService();
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/settings/platform', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(service.get).toHaveBeenCalled();
  });

  it('lets a Super Admin update platform settings', async () => {
    const service = settingsService();
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'PATCH', url: '/v1/admin/settings/platform', headers: { cookie: 'session=test' }, payload: { supportEmail: 'help@dentra.ph' } });
    expect(response.statusCode).toBe(200);
    expect(service.update).toHaveBeenCalledWith({ supportEmail: 'help@dentra.ph' }, expect.objectContaining({ id: '66666666-6666-4666-8666-666666666666' }));
  });

  it('rejects a malformed support email at the route boundary', async () => {
    const service = settingsService();
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'PATCH', url: '/v1/admin/settings/platform', headers: { cookie: 'session=test' }, payload: { supportEmail: 'not-an-email' } });
    expect(response.statusCode).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('surfaces a service-level error from a settings update', async () => {
    const service = settingsService({ update: vi.fn(async () => { throw new PlatformSettingsError('UPDATE_FAILED', 'Unable to update platform settings', 500); }) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'PATCH', url: '/v1/admin/settings/platform', headers: { cookie: 'session=test' }, payload: { supportEmail: 'help@dentra.ph' } });
    expect(response.statusCode).toBe(500);
  });

  it('lists the current sessions for a Super Admin', async () => {
    const service = settingsService();
    const listSessions = vi.fn(async () => [{ id: 's1', token: 'tok', createdAt: new Date(), expiresAt: new Date(), ipAddress: null, userAgent: null }]);
    await setup(adminContext(), service, { listSessions });
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/settings/sessions', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(listSessions).toHaveBeenCalled();
  });

  it('lets a Super Admin revoke a specific session', async () => {
    const service = settingsService();
    const revokeSession = vi.fn(async () => undefined);
    await setup(adminContext(), service, { revokeSession });
    const response = await app!.inject({ method: 'POST', url: '/v1/admin/settings/sessions/revoke', headers: { cookie: 'session=test' }, payload: { token: 'some-session-token' } });
    expect(response.statusCode).toBe(200);
    expect(revokeSession).toHaveBeenCalledWith(expect.anything(), 'some-session-token');
  });

  it('lets a Super Admin sign out all other devices', async () => {
    const service = settingsService();
    const revokeOtherSessions = vi.fn(async () => undefined);
    await setup(adminContext(), service, { revokeOtherSessions });
    const response = await app!.inject({ method: 'POST', url: '/v1/admin/settings/sessions/revoke-others', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(revokeOtherSessions).toHaveBeenCalled();
  });

  it('returns 501 when session management is unavailable', async () => {
    const service = settingsService();
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/settings/sessions', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(501);
  });
});
