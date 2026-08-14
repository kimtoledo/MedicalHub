import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../src/auth/types.js';
import type { PlatformOperationsService } from '../src/platform/operations-service.js';
import { OperationsError } from '../src/platform/operations-service.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';

function clinicContext(role: ClinicRole): AuthorizationContext { return { user: { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test', name: 'Staff', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role, dentistId: null }] }; }
function adminContext(): AuthorizationContext { return { user: { id: '66666666-6666-4666-8666-666666666666', email: 'admin@example.test', name: 'Admin', platformRole: 'super_admin' }, strategies: ['superAdmin'], clinicMemberships: [] }; }
function auth(value: AuthorizationContext): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value) }; }
function operations(overrides: Record<string, unknown> = {}): PlatformOperationsService { return { requestSupportAccess: vi.fn(), listSupportAccess: vi.fn(async () => []), reviewSupportAccess: vi.fn(), requestExport: vi.fn(), listExports: vi.fn(async () => []), markExport: vi.fn(), generateExport: vi.fn(), downloadUrl: vi.fn(), streamExport: vi.fn(async () => null), activeClinics: vi.fn(async () => []), listFeatureFlags: vi.fn(async () => []), createFeatureFlag: vi.fn(), setFeatureFlagRollout: vi.fn(), addFeatureFlagClinic: vi.fn(), removeFeatureFlagClinic: vi.fn(), isFeatureEnabledForClinic: vi.fn(async () => false), setMaintenanceMode: vi.fn(), storageUsage: vi.fn(async () => ({ totalBytes: 0, fileCount: 0, topClinics: [] })), ...overrides } as unknown as PlatformOperationsService; }

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(context: AuthorizationContext, service: PlatformOperationsService) { app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context), platformOperations: service }); }

describe('platform operations console API', () => {
  it('lets a clinic admin submit a support-access request', async () => {
    const service = operations({ requestSupportAccess: vi.fn(async () => ({ id: REQUEST_ID, status: 'pending' as const })) });
    await setup(clinicContext('clinic_owner'), service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/operations/support-access`, headers: { cookie: 'session=test' }, payload: { reason: 'Need help investigating a duplicate invoice issue.' } });
    expect(response.statusCode).toBe(201);
    expect(service.requestSupportAccess).toHaveBeenCalledWith(CLINIC_ID, 'Need help investigating a duplicate invoice issue.', expect.objectContaining({ id: '22222222-2222-4222-8222-222222222222' }));
  });

  it('rejects a support-access reason shorter than 10 characters', async () => {
    const service = operations();
    await setup(clinicContext('clinic_owner'), service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/operations/support-access`, headers: { cookie: 'session=test' }, payload: { reason: 'short' } });
    expect(response.statusCode).toBe(400);
    expect(service.requestSupportAccess).not.toHaveBeenCalled();
  });

  it('denies a non-admin clinic role from requesting an export', async () => {
    const service = operations();
    await setup(clinicContext('dentist'), service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/operations/exports`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(service.requestExport).not.toHaveBeenCalled();
  });

  it('lets a clinic admin view their own request history', async () => {
    const service = operations({ listSupportAccess: vi.fn(async () => [{ id: REQUEST_ID, status: 'pending' as const }]) });
    await setup(clinicContext('clinic_admin'), service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/operations/support-access`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(service.listSupportAccess).toHaveBeenCalledWith(CLINIC_ID);
  });

  it('denies clinic staff access to the Super Admin queue', async () => {
    const service = operations();
    await setup(clinicContext('clinic_owner'), service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/operations/support-access', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(service.listSupportAccess).not.toHaveBeenCalled();
  });

  it('lets a Super Admin list and approve a support-access request', async () => {
    const service = operations({ listSupportAccess: vi.fn(async () => [{ id: REQUEST_ID, status: 'pending' as const }]), reviewSupportAccess: vi.fn(async () => ({ id: REQUEST_ID, status: 'approved' as const, expiresAt: new Date('2026-08-13T09:30:00Z') })) });
    await setup(adminContext(), service);
    const list = await app!.inject({ method: 'GET', url: '/v1/admin/operations/support-access', headers: { cookie: 'session=test' } });
    expect(list.statusCode).toBe(200);
    const review = await app!.inject({ method: 'PATCH', url: `/v1/admin/operations/support-access/${REQUEST_ID}`, headers: { cookie: 'session=test' }, payload: { status: 'approved' } });
    expect(review.statusCode).toBe(200);
    expect(review.json().data.status).toBe('approved');
  });

  it('rejects reviewing a request that is no longer pending', async () => {
    const service = operations({ reviewSupportAccess: vi.fn(async () => { throw new OperationsError('REQUEST_NOT_FOUND', 'Pending support request not found', 404); }) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'PATCH', url: `/v1/admin/operations/support-access/${REQUEST_ID}`, headers: { cookie: 'session=test' }, payload: { status: 'approved' } });
    expect(response.statusCode).toBe(404);
  });

  it('lets a Super Admin mark an export request processing', async () => {
    const service = operations({ markExport: vi.fn(async () => ({ id: REQUEST_ID, status: 'processing' as const })) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'PATCH', url: `/v1/admin/operations/exports/${REQUEST_ID}`, headers: { cookie: 'session=test' }, payload: { status: 'processing' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe('processing');
  });

  it('rejects marking an export ready directly — only generateExport can reach that state', async () => {
    const service = operations();
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'PATCH', url: `/v1/admin/operations/exports/${REQUEST_ID}`, headers: { cookie: 'session=test' }, payload: { status: 'ready' } });
    expect(response.statusCode).toBe(400);
    expect(service.markExport).not.toHaveBeenCalled();
  });

  it('lets a Super Admin generate a real export artifact', async () => {
    const service = operations({ generateExport: vi.fn(async () => ({ id: REQUEST_ID, status: 'ready' as const, artifactReference: `exports/${CLINIC_ID}/${REQUEST_ID}.json` })) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'POST', url: `/v1/admin/operations/exports/${REQUEST_ID}/generate`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe('ready');
    expect(service.generateExport).toHaveBeenCalledWith(REQUEST_ID, expect.objectContaining({ id: '66666666-6666-4666-8666-666666666666' }));
  });

  it('surfaces a failed export generation', async () => {
    const service = operations({ generateExport: vi.fn(async () => { throw new OperationsError('EXPORT_UPLOAD_FAILED', 'Unable to store the export artifact', 500); }) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'POST', url: `/v1/admin/operations/exports/${REQUEST_ID}/generate`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(500);
  });

  it('mints a download URL once an export is ready', async () => {
    const service = operations({ downloadUrl: vi.fn(async () => ({ downloadUrl: `/v1/clinic/${CLINIC_ID}/operations/exports/${REQUEST_ID}/download?token=abc` })) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/operations/exports/${REQUEST_ID}/download-url`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.downloadUrl).toContain('/download?token=');
  });

  it('rejects a download-url request before the export is ready', async () => {
    const service = operations({ downloadUrl: vi.fn(async () => { throw new OperationsError('EXPORT_NOT_READY', 'Export artifact is not ready yet', 409); }) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/operations/exports/${REQUEST_ID}/download-url`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(409);
  });

  it('lets a clinic admin mint their own export download URL', async () => {
    const service = operations({ downloadUrl: vi.fn(async () => ({ downloadUrl: `/v1/clinic/${CLINIC_ID}/operations/exports/${REQUEST_ID}/download?token=abc` })) });
    await setup(clinicContext('clinic_owner'), service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/operations/exports/${REQUEST_ID}/download-url`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(service.downloadUrl).toHaveBeenCalledWith(REQUEST_ID, expect.objectContaining({ id: '22222222-2222-4222-8222-222222222222' }), CLINIC_ID);
  });

  it('streams the export artifact for a valid download token, no session required', async () => {
    const service = operations({ streamExport: vi.fn(async () => ({ buffer: Buffer.from('{"ok":true}'), filename: `dentra-export-${REQUEST_ID}.json` })) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/operations/exports/${REQUEST_ID}/download?token=abcdefghij123456` });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.body).toBe('{"ok":true}');
  });

  it('returns 404 for an expired or invalid download token', async () => {
    const service = operations({ streamExport: vi.fn(async () => null) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/operations/exports/${REQUEST_ID}/download?token=expiredtoken123` });
    expect(response.statusCode).toBe(404);
  });

  it('returns the active clinic inventory to a Super Admin', async () => {
    const service = operations({ activeClinics: vi.fn(async () => [{ id: CLINIC_ID, name: 'Smile Dental', status: 'active' as const, createdAt: new Date('2026-01-01') }]) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/operations/clinics', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
  });

  it('lets a Super Admin create a feature flag', async () => {
    const service = operations({ createFeatureFlag: vi.fn(async () => ({ id: '11111111-1111-4111-8111-111111111111', key: 'new-odontogram', name: 'New odontogram', enabledByDefault: false })) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'POST', url: '/v1/admin/operations/feature-flags', headers: { cookie: 'session=test' }, payload: { key: 'new-odontogram', name: 'New odontogram' } });
    expect(response.statusCode).toBe(201);
    expect(service.createFeatureFlag).toHaveBeenCalledWith({ key: 'new-odontogram', name: 'New odontogram' }, expect.objectContaining({ id: '66666666-6666-4666-8666-666666666666' }));
  });

  it('rejects a feature flag key with invalid characters', async () => {
    const service = operations();
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'POST', url: '/v1/admin/operations/feature-flags', headers: { cookie: 'session=test' }, payload: { key: 'New Odontogram!', name: 'New odontogram' } });
    expect(response.statusCode).toBe(400);
    expect(service.createFeatureFlag).not.toHaveBeenCalled();
  });

  it('denies clinic staff from managing feature flags', async () => {
    const service = operations();
    await setup(clinicContext('clinic_owner'), service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/operations/feature-flags', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(service.listFeatureFlags).not.toHaveBeenCalled();
  });

  it('lets a Super Admin flip a flag to full rollout', async () => {
    const service = operations({ setFeatureFlagRollout: vi.fn(async () => ({ id: '11111111-1111-4111-8111-111111111111', enabledByDefault: true })) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'PATCH', url: '/v1/admin/operations/feature-flags/11111111-1111-4111-8111-111111111111', headers: { cookie: 'session=test' }, payload: { enabledByDefault: true } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.enabledByDefault).toBe(true);
  });

  it('lets a Super Admin target a clinic for a limited rollout', async () => {
    const service = operations({ addFeatureFlagClinic: vi.fn(async () => ({ id: 'target-1', flagId: '11111111-1111-4111-8111-111111111111', clinicId: CLINIC_ID })) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'POST', url: `/v1/admin/operations/feature-flags/11111111-1111-4111-8111-111111111111/clinics/${CLINIC_ID}`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(201);
    expect(service.addFeatureFlagClinic).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', CLINIC_ID, expect.objectContaining({ id: '66666666-6666-4666-8666-666666666666' }));
  });

  it('surfaces a conflict when the clinic is already targeted', async () => {
    const service = operations({ addFeatureFlagClinic: vi.fn(async () => { throw new OperationsError('CLINIC_ALREADY_TARGETED', 'This clinic already has the flag enabled', 409); }) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'POST', url: `/v1/admin/operations/feature-flags/11111111-1111-4111-8111-111111111111/clinics/${CLINIC_ID}`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(409);
  });

  it('lets a Super Admin remove a clinic from a limited rollout', async () => {
    const service = operations({ removeFeatureFlagClinic: vi.fn(async () => ({ removed: true })) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'DELETE', url: `/v1/admin/operations/feature-flags/11111111-1111-4111-8111-111111111111/clinics/${CLINIC_ID}`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(service.removeFeatureFlagClinic).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', CLINIC_ID, expect.objectContaining({ id: '66666666-6666-4666-8666-666666666666' }));
  });

  it('lets a Super Admin toggle maintenance mode for a clinic', async () => {
    const service = operations({ setMaintenanceMode: vi.fn(async () => ({ id: CLINIC_ID, name: 'Smile Dental', maintenanceMode: true })) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'PATCH', url: `/v1/admin/operations/clinics/${CLINIC_ID}/maintenance-mode`, headers: { cookie: 'session=test' }, payload: { enabled: true } });
    expect(response.statusCode).toBe(200);
    expect(service.setMaintenanceMode).toHaveBeenCalledWith(CLINIC_ID, true, expect.objectContaining({ id: '66666666-6666-4666-8666-666666666666' }));
  });

  it('denies clinic staff from toggling maintenance mode', async () => {
    const service = operations();
    await setup(clinicContext('clinic_owner'), service);
    const response = await app!.inject({ method: 'PATCH', url: `/v1/admin/operations/clinics/${CLINIC_ID}/maintenance-mode`, headers: { cookie: 'session=test' }, payload: { enabled: true } });
    expect(response.statusCode).toBe(403);
    expect(service.setMaintenanceMode).not.toHaveBeenCalled();
  });

  it('returns real storage usage to a Super Admin', async () => {
    const service = operations({ storageUsage: vi.fn(async () => ({ totalBytes: 123456, fileCount: 7, topClinics: [{ clinicId: CLINIC_ID, clinicName: 'Smile Dental', totalBytes: 123456, fileCount: 7 }] })) });
    await setup(adminContext(), service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/operations/storage-usage', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.totalBytes).toBe(123456);
    expect(service.storageUsage).toHaveBeenCalled();
  });

  it('denies clinic staff from storage usage', async () => {
    const service = operations();
    await setup(clinicContext('clinic_owner'), service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/operations/storage-usage', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(service.storageUsage).not.toHaveBeenCalled();
  });
});
