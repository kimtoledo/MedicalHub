import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { ApiConfig } from '../src/config.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { EntitlementService } from '../src/entitlements/service.js';
import type { ClinicServiceCatalogService } from '../src/clinic/service-catalog-service.js';
import { FeatureKey } from '@dentra/shared';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5000'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_CLINIC = '44444444-4444-4444-8444-444444444444';
const SERVICE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BRANCH_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const adminContext: AuthorizationContext = { user: { id: '22222222-2222-4222-8222-222222222222', email: 'admin@example.test', name: 'Clinic Admin', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role: 'clinic_admin', dentistId: null }] };
const otherContext: AuthorizationContext = { ...adminContext, clinicMemberships: [{ ...adminContext.clinicMemberships[0], clinicId: OTHER_CLINIC }] };

function auth(context: AuthorizationContext | null): AuthServices {
  return { handler: vi.fn(async () => new Response('{}')), getSession: vi.fn(async () => context ? { session: { id: '44444444-4444-4444-8444-444444444444', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user } : null), resolveAuthorization: vi.fn(async () => context) };
}
function entitlements(): EntitlementService {
  return { resolve: vi.fn(async (clinicId) => ({ clinic: { id: clinicId, name: 'Test Clinic', status: 'active' }, subscription: null, entitlements: Object.values(FeatureKey).map((featureKey) => ({ featureKey, isEnabled: true, source: 'override' as const, expiresAt: null })) })) };
}
function catalog(overrides: Partial<ClinicServiceCatalogService> = {}): ClinicServiceCatalogService {
  return {
    listServices: vi.fn(async () => []),
    listBranches: vi.fn(async () => [{ id: BRANCH_ID, name: 'Main Branch' }]),
    createService: vi.fn(async () => ({ id: SERVICE_ID })),
    updateService: vi.fn(async () => ({ id: SERVICE_ID })),
    setPrice: vi.fn(async () => ({ id: SERVICE_ID, pricePhp: '850.00', branchId: BRANCH_ID })),
    listPriceHistory: vi.fn(async () => []),
    ...overrides,
  };
}

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });

describe('clinic service catalog routes', () => {
  it('requires authentication and tenant membership', async () => {
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(null), entitlements: entitlements(), clinicServiceCatalog: catalog() });
    expect((await app.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/catalog/services` })).statusCode).toBe(401);
    await app.close();
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(otherContext), entitlements: entitlements(), clinicServiceCatalog: catalog() });
    expect((await app.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/catalog/services`, headers: { cookie: 'session=test' } })).statusCode).toBe(403);
  });

  it('creates services only through the clinic admin workflow', async () => {
    const service = catalog();
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(adminContext), entitlements: entitlements(), clinicServiceCatalog: service });
    const response = await app.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/catalog/services`, headers: { cookie: 'session=test', 'content-type': 'application/json' }, payload: { name: 'Night Guard', category: 'Preventive', durationMinutes: 60, pricePhp: '2500.00', isBookable: false, isActive: true } });
    expect(response.statusCode).toBe(201);
    expect(service.createService).toHaveBeenCalledWith(CLINIC_ID, expect.objectContaining({ name: 'Night Guard', isBookable: false }), expect.anything());
  });

  it('passes branch overrides and returns price history through protected routes', async () => {
    const service = catalog();
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(adminContext), entitlements: entitlements(), clinicServiceCatalog: service });
    const price = await app.inject({ method: 'PUT', url: `/v1/clinic/${CLINIC_ID}/catalog/services/${SERVICE_ID}/price`, headers: { cookie: 'session=test', 'content-type': 'application/json' }, payload: { branchId: BRANCH_ID, pricePhp: '850.00' } });
    expect(price.statusCode).toBe(200);
    expect(service.setPrice).toHaveBeenCalledWith(CLINIC_ID, SERVICE_ID, expect.objectContaining({ branchId: BRANCH_ID, pricePhp: '850.00' }), expect.anything());
    const history = await app.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/catalog/services/${SERVICE_ID}/price-history`, headers: { cookie: 'session=test' } });
    expect(history.statusCode).toBe(200);
  });
});
