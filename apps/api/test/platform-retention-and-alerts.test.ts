import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../src/auth/types.js';
import type { PlatformOperationsService } from '../src/platform/operations-service.js';
import type { RetentionService } from '../src/platform/retention-service.js';
import { RetentionError } from '../src/platform/retention-service.js';
import type { SecurityAlertService } from '../src/platform/security-alerts-service.js';
import { SecurityAlertError } from '../src/platform/security-alerts-service.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const FLAG_ID = '77777777-7777-4777-8777-777777777777';
const ALERT_ID = '88888888-8888-4888-8888-888888888888';

function clinicContext(role: ClinicRole): AuthorizationContext { return { user: { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test', name: 'Staff', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role, dentistId: null }] }; }
function adminContext(): AuthorizationContext { return { user: { id: '66666666-6666-4666-8666-666666666666', email: 'admin@example.test', name: 'Admin', platformRole: 'super_admin' }, strategies: ['superAdmin'], clinicMemberships: [] }; }
function auth(value: AuthorizationContext): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value) }; }
function operations(): PlatformOperationsService { return { requestSupportAccess: vi.fn(), listSupportAccess: vi.fn(async () => []), reviewSupportAccess: vi.fn(), requestExport: vi.fn(), listExports: vi.fn(async () => []), markExport: vi.fn(), generateExport: vi.fn(), downloadUrl: vi.fn(), streamExport: vi.fn(async () => null), activeClinics: vi.fn(async () => []) } as unknown as PlatformOperationsService; }
function retentionService(overrides: Partial<RetentionService> = {}): RetentionService { return { scan: vi.fn(async () => ({ flagged: 0, reviewWindowDays: 90 })), list: vi.fn(async () => []), resolve: vi.fn(async () => ({ id: FLAG_ID, status: 'dismissed' as const })), ...overrides } as unknown as RetentionService; }
function alertService(overrides: Partial<SecurityAlertService> = {}): SecurityAlertService { return { scan: vi.fn(async () => ({ raised: 0 })), list: vi.fn(async () => []), resolve: vi.fn(async () => ({ id: ALERT_ID, status: 'acknowledged' as const })), ...overrides } as unknown as SecurityAlertService; }

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(context: AuthorizationContext, retention: RetentionService, securityAlerts: SecurityAlertService) { app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context), platformOperations: operations(), retention, securityAlerts }); }

describe('data retention review queue', () => {
  it('lets a Super Admin trigger a retention scan', async () => {
    const retention = retentionService({ scan: vi.fn(async () => ({ flagged: 2, reviewWindowDays: 90 })) });
    await setup(adminContext(), retention, alertService());
    const response = await app!.inject({ method: 'POST', url: '/v1/admin/operations/retention/scan', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.flagged).toBe(2);
  });

  it('denies clinic staff from the retention queue', async () => {
    const retention = retentionService();
    await setup(clinicContext('clinic_owner'), retention, alertService());
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/operations/retention', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(retention.list).not.toHaveBeenCalled();
  });

  it('lists flags filtered by status', async () => {
    const retention = retentionService({ list: vi.fn(async () => [{ id: FLAG_ID, status: 'pending' as const }]) as never });
    await setup(adminContext(), retention, alertService());
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/operations/retention?status=pending', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(retention.list).toHaveBeenCalledWith('pending');
  });

  it('lets a Super Admin resolve a flag with notes', async () => {
    const retention = retentionService();
    await setup(adminContext(), retention, alertService());
    const response = await app!.inject({ method: 'POST', url: `/v1/admin/operations/retention/${FLAG_ID}/resolve`, headers: { cookie: 'session=test' }, payload: { resolution: 'dismissed', notes: 'Clinic re-engaged, keeping active.' } });
    expect(response.statusCode).toBe(200);
    expect(retention.resolve).toHaveBeenCalledWith(FLAG_ID, 'dismissed', 'Clinic re-engaged, keeping active.', expect.objectContaining({ id: '66666666-6666-4666-8666-666666666666' }));
  });

  it('rejects a resolution without notes', async () => {
    const retention = retentionService();
    await setup(adminContext(), retention, alertService());
    const response = await app!.inject({ method: 'POST', url: `/v1/admin/operations/retention/${FLAG_ID}/resolve`, headers: { cookie: 'session=test' }, payload: { resolution: 'dismissed' } });
    expect(response.statusCode).toBe(400);
    expect(retention.resolve).not.toHaveBeenCalled();
  });

  it('surfaces a not-found error when resolving a non-pending flag', async () => {
    const retention = retentionService({ resolve: vi.fn(async () => { throw new RetentionError('FLAG_NOT_FOUND', 'Pending retention flag not found', 404); }) });
    await setup(adminContext(), retention, alertService());
    const response = await app!.inject({ method: 'POST', url: `/v1/admin/operations/retention/${FLAG_ID}/resolve`, headers: { cookie: 'session=test' }, payload: { resolution: 'dismissed', notes: 'already reviewed previously' } });
    expect(response.statusCode).toBe(404);
  });
});

describe('security alert queue', () => {
  it('lets a Super Admin trigger a security-alert scan', async () => {
    const alerts = alertService({ scan: vi.fn(async () => ({ raised: 1 })) });
    await setup(adminContext(), retentionService(), alerts);
    const response = await app!.inject({ method: 'POST', url: '/v1/admin/operations/security-alerts/scan', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.raised).toBe(1);
  });

  it('denies clinic staff from security alerts', async () => {
    const alerts = alertService();
    await setup(clinicContext('clinic_owner'), retentionService(), alerts);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/operations/security-alerts', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(alerts.list).not.toHaveBeenCalled();
  });

  it('lets a Super Admin acknowledge an alert', async () => {
    const alerts = alertService();
    await setup(adminContext(), retentionService(), alerts);
    const response = await app!.inject({ method: 'POST', url: `/v1/admin/operations/security-alerts/${ALERT_ID}/resolve`, headers: { cookie: 'session=test' }, payload: { resolution: 'acknowledged' } });
    expect(response.statusCode).toBe(200);
    expect(alerts.resolve).toHaveBeenCalledWith(ALERT_ID, 'acknowledged', expect.objectContaining({ id: '66666666-6666-4666-8666-666666666666' }));
  });

  it('surfaces a not-found error when resolving a non-open alert', async () => {
    const alerts = alertService({ resolve: vi.fn(async () => { throw new SecurityAlertError('ALERT_NOT_FOUND', 'Open security alert not found', 404); }) });
    await setup(adminContext(), retentionService(), alerts);
    const response = await app!.inject({ method: 'POST', url: `/v1/admin/operations/security-alerts/${ALERT_ID}/resolve`, headers: { cookie: 'session=test' }, payload: { resolution: 'dismissed' } });
    expect(response.statusCode).toBe(404);
  });
});
