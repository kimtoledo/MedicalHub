import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../src/auth/types.js';
import type { ClinicAnalyticsService } from '../src/clinic/analytics-service.js';
import type { ApiConfig } from '../src/config.js';
import type { EntitlementService } from '../src/entitlements/service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const BRANCH_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_BRANCH_ID = '55555555-5555-4555-8555-555555555555';
function context(role: ClinicRole, branchId: string | null): AuthorizationContext { return { user: { id: '22222222-2222-4222-8222-222222222222', email: 'user@example.test', name: 'User', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId, role, dentistId: role === 'dentist' ? '77777777-7777-4777-8777-777777777777' : null }] }; }
function auth(value: AuthorizationContext): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value) }; }
function entitlements(enabled = true): EntitlementService { return { resolve: vi.fn(async () => ({ clinic: { id: CLINIC_ID, name: 'Clinic', status: 'active' }, subscription: null, entitlements: [{ featureKey: FeatureKey.REPORTS_ADVANCED, isEnabled: enabled, source: 'override' as const, expiresAt: null }] })) }; }
function analytics(): ClinicAnalyticsService { return { summary: vi.fn(async () => ({ range: {}, trends: { appointments: [{ day: '2026-08-01', status: 'completed' as const, total: 2 }], revenue: [{ day: '2026-08-01', revenuePhp: '1000' }] }, conversionRate: 1, noShowRate: 0, cancellationRate: 0, treatmentAcceptanceRate: 0.5, revenueVisible: true })) } as unknown as ClinicAnalyticsService; }
let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(role: ClinicRole, branchId: string | null, enabled = true) { const service = analytics(); app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context(role, branchId)), entitlements: entitlements(enabled), clinicAnalytics: service }); return service; }

describe('advanced analytics UI API', () => {
  it('passes an authorized branch and hides revenue from dentists', async () => { const service = await setup('dentist', BRANCH_ID); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/analytics?from=2026-08-01&to=2026-08-13&branchId=${BRANCH_ID}`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(200); expect(service.summary).toHaveBeenCalledWith(CLINIC_ID, { from: new Date('2026-07-31T16:00:00.000Z'), to: new Date('2026-08-13T15:59:59.999Z') }, { branchIds: [BRANCH_ID], includeRevenue: false }); });
  it('denies a branch outside the membership scope', async () => { const service = await setup('dentist', BRANCH_ID); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/analytics?from=2026-08-01&to=2026-08-13&branchId=${OTHER_BRANCH_ID}`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(403); expect(service.summary).not.toHaveBeenCalled(); });
  it('allows clinic-wide owners to view revenue trends', async () => { const service = await setup('clinic_owner', null); await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/analytics?from=2026-08-01&to=2026-08-13`, headers: { cookie: 'session=test' } }); expect(service.summary).toHaveBeenCalledWith(CLINIC_ID, expect.any(Object), { branchIds: null, includeRevenue: true }); });
  it('enforces the reports.advanced entitlement', async () => { const service = await setup('clinic_admin', null, false); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/analytics?from=2026-08-01&to=2026-08-13`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(403); expect(service.summary).not.toHaveBeenCalled(); });
  it('exports aggregate-only CSV data', async () => { await setup('clinic_owner', null); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/analytics?from=2026-08-01&to=2026-08-13&format=csv`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(200); expect(response.headers['content-type']).toContain('text/csv'); expect(response.body).toContain('appointments.completed'); expect(response.body).not.toContain('patient'); expect(response.body).not.toContain('clinical'); });
});
