import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../src/auth/types.js';
import type { AiImagingService } from '../src/clinic/ai-imaging-service.js';
import { AiImagingError } from '../src/clinic/ai-imaging-service.js';
import type { ApiConfig } from '../src/config.js';
import type { EntitlementService } from '../src/entitlements/service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const PATIENT_ID = '44444444-4444-4444-8444-444444444444';
const FILE_ID = '55555555-5555-4555-8555-555555555555';
const ANALYSIS_ID = '66666666-6666-4666-8666-666666666666';

function context(role: ClinicRole): AuthorizationContext { return { user: { id: '22222222-2222-4222-8222-222222222222', email: 'dentist@example.test', name: 'Dentist', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role, dentistId: role === 'dentist' ? '77777777-7777-4777-8777-777777777777' : null }] }; }
function auth(value: AuthorizationContext): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value) }; }
function entitlements(enabled = true): EntitlementService { return { resolve: vi.fn(async () => ({ clinic: { id: CLINIC_ID, name: 'Clinic', status: 'active', maintenanceMode: false }, subscription: null, entitlements: [{ featureKey: FeatureKey.AI_IMAGING, isEnabled: enabled, source: 'override' as const, expiresAt: null }] })) }; }
function imaging(overrides: Record<string, unknown> = {}): AiImagingService { return { analyzeRadiograph: vi.fn(), list: vi.fn(async () => []), confirm: vi.fn(), oralHealthScore: vi.fn(async () => ({ score: null, createdAt: null })), ...overrides } as unknown as AiImagingService; }

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(role: ClinicRole, service: AiImagingService, enabled = true) { app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context(role)), entitlements: entitlements(enabled), aiImaging: service }); }

describe('AI imaging UI API', () => {
  it('runs a radiograph analysis for an authorized dentist', async () => {
    const service = imaging({ analyzeRadiograph: vi.fn(async () => ({ id: ANALYSIS_ID, status: 'completed' as const, findings: [], oralHealthScore: 82, createdAt: new Date('2026-08-13') })) });
    await setup('dentist', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/ai-imaging/radiographs`, headers: { cookie: 'session=test' }, payload: { fileId: FILE_ID } });
    expect(response.statusCode).toBe(201);
    expect(response.json().data.oralHealthScore).toBe(82);
    expect(service.analyzeRadiograph).toHaveBeenCalledWith(CLINIC_ID, FILE_ID, undefined, expect.objectContaining({ id: '22222222-2222-4222-8222-222222222222' }));
  });

  it('denies analysis for a receptionist role', async () => {
    const service = imaging();
    await setup('receptionist', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/ai-imaging/radiographs`, headers: { cookie: 'session=test' }, payload: { fileId: FILE_ID } });
    expect(response.statusCode).toBe(403);
    expect(service.analyzeRadiograph).not.toHaveBeenCalled();
  });

  it('enforces the ai.imaging entitlement', async () => {
    const service = imaging();
    await setup('dentist', service, false);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/ai-imaging/radiographs`, headers: { cookie: 'session=test' }, payload: { fileId: FILE_ID } });
    expect(response.statusCode).toBe(403);
    expect(service.analyzeRadiograph).not.toHaveBeenCalled();
  });

  it('rejects a non-radiograph file', async () => {
    const service = imaging({ analyzeRadiograph: vi.fn(async () => { throw new AiImagingError('RADIOGRAPH_REQUIRED', 'AI imaging accepts radiograph files only'); }) });
    await setup('dentist', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/ai-imaging/radiographs`, headers: { cookie: 'session=test' }, payload: { fileId: FILE_ID } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('RADIOGRAPH_REQUIRED');
  });

  it('lists analyses for a patient', async () => {
    const service = imaging({ list: vi.fn(async () => [{ id: ANALYSIS_ID, status: 'completed' as const, findings: [], oralHealthScore: 70, createdAt: new Date('2026-08-01') }]) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/ai-imaging/patients/${PATIENT_ID}`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(service.list).toHaveBeenCalledWith(CLINIC_ID, PATIENT_ID);
  });

  it('confirms a completed analysis', async () => {
    const service = imaging({ confirm: vi.fn(async () => ({ id: ANALYSIS_ID, confirmedBy: '22222222-2222-4222-8222-222222222222', confirmedAt: new Date('2026-08-13') })) });
    await setup('dentist', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/ai-imaging/${ANALYSIS_ID}/confirm`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.confirmedBy).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('rejects confirming an analysis that is not completed', async () => {
    const service = imaging({ confirm: vi.fn(async () => { throw new AiImagingError('ANALYSIS_NOT_READY', 'Only completed analyses can be confirmed', 409); }) });
    await setup('dentist', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/ai-imaging/${ANALYSIS_ID}/confirm`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(409);
  });

  it('returns a null score before any analysis exists', async () => {
    const service = imaging({ oralHealthScore: vi.fn(async () => ({ score: null, createdAt: null })) });
    await setup('clinic_admin', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/ai-imaging/patients/${PATIENT_ID}/score`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.score).toBeNull();
  });

  it('returns the latest score after an analysis', async () => {
    const service = imaging({ oralHealthScore: vi.fn(async () => ({ score: 88, createdAt: new Date('2026-08-13') })) });
    await setup('clinic_admin', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/ai-imaging/patients/${PATIENT_ID}/score`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.score).toBe(88);
  });
});
