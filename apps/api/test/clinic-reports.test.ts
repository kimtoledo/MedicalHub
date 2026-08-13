import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ClinicReportsService } from '../src/clinic/reports-service.js';
import type { ApiConfig } from '../src/config.js';
import type { EntitlementService } from '../src/entitlements/service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5000'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333', BRANCH_ID = '44444444-4444-4444-8444-444444444444';
function context(role: AuthorizationContext['clinicMemberships'][number]['role']): AuthorizationContext { return { user: { id: '22222222-2222-4222-8222-222222222222', email: 'user@example.test', name: 'User', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role, dentistId: role === 'dentist' ? '77777777-7777-4777-8777-777777777777' : null }] }; }
function auth(value: AuthorizationContext): AuthServices { return { handler: vi.fn(async () => new Response('{}')), getSession: vi.fn(async () => ({ session: { id: 's', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value) }; }
function entitlements(): EntitlementService { return { resolve: vi.fn(async (clinicId) => ({ clinic: { id: clinicId, name: 'Clinic', status: 'active', maintenanceMode: false }, subscription: null, entitlements: [{ featureKey: FeatureKey.REPORTS_BASIC, isEnabled: true, source: 'override' as const, expiresAt: null }] })) }; }
function reports(): ClinicReportsService { return { filters: vi.fn(async () => ({ branches: [], dentists: [], services: [] })), operational: vi.fn(async () => ({ byStatus: [], byDentist: [], byService: [], patientsRegistered: 0, details: [{ id: 'a', startsAt: new Date('2026-08-13T00:00:00Z'), status: 'completed' as const, branch: 'Main', dentist: 'Dr Test', service: 'Cleaning' }] })), financial: vi.fn(async () => ({ byMethod: [], byService: [], outstandingPhp: '0', details: [] })), inventory: vi.fn(async () => []) }; }
let app: FastifyInstance | undefined; afterEach(async () => { await app?.close(); app = undefined; });
async function setup(role: AuthorizationContext['clinicMemberships'][number]['role']) { const service = reports(); app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context(role)), entitlements: entitlements(), clinicReports: service }); return service; }

describe('clinic report routes', () => {
  it('passes validated URL filters and Manila date bounds to operational reports', async () => { const service = await setup('clinic_admin'); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/reports/operational?from=2026-08-01&to=2026-08-13&branchId=${BRANCH_ID}&status=completed` , headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(200); expect(service.operational).toHaveBeenCalledWith(CLINIC_ID, { from: new Date('2026-07-31T16:00:00.000Z'), to: new Date('2026-08-13T15:59:59.999Z') }, expect.objectContaining({ branchId: BRANCH_ID, status: 'completed' })); });
  it('enforces financial visibility by clinic role on the server', async () => { const service = await setup('dentist'); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/reports/financial?from=2026-08-01&to=2026-08-13`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(403); expect(service.financial).not.toHaveBeenCalled(); });
  it('exports meaningful operational detail columns as CSV', async () => { await setup('clinic_owner'); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/reports/operational?from=2026-08-01&to=2026-08-13&format=csv`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(200); expect(response.headers['content-type']).toContain('text/csv'); expect(response.body).toContain('"startsAt","status","branch","dentist","service"'); expect(response.body).toContain('"Cleaning"'); });
  it('rejects reversed date ranges before querying', async () => { const service = await setup('clinic_admin'); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/reports/operational?from=2026-08-13&to=2026-08-01`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(400); expect(service.operational).not.toHaveBeenCalled(); });
});
