import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import type { EntitlementService } from '../src/entitlements/service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: [], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const clinicId = '33333333-3333-4333-8333-333333333333'; const otherClinicId = '44444444-4444-4444-8444-444444444444';
const member: AuthorizationContext = { user: { id: 'user', email: 'user@test', name: 'User', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId, branchId: null, role: 'clinic_admin', dentistId: null }] };
let app: FastifyInstance | undefined; afterEach(async () => { await app?.close(); app = undefined; });
const auth = (context: AuthorizationContext | null): AuthServices => ({ handler: vi.fn(async () => new Response()), getSession: vi.fn(async () => context ? { session: { id: 's', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user } : null), resolveAuthorization: vi.fn(async () => context) });
const service = (): EntitlementService => ({ resolve: vi.fn(async (id) => ({ clinic: { id, name: 'Smile Bright', status: 'active', maintenanceMode: false }, subscription: { id: 'sub', status: 'active', package: { id: 'pkg', name: 'Professional', slug: 'professional' } }, entitlements: [{ featureKey: FeatureKey.APPOINTMENTS_MANAGE, isEnabled: true, source: 'package' as const, expiresAt: null }] })) });
async function setup(context: AuthorizationContext | null, entitlements: EntitlementService) { app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth: auth(context), entitlements }); }

describe('GET /v1/entitlements/:clinicId', () => {
  it('returns resolved entitlements to an active member of that clinic', async () => { const entitlements = service(); await setup(member, entitlements); const response = await app!.inject({ method: 'GET', url: `/v1/entitlements/${clinicId}` }); expect(response.statusCode).toBe(200); expect(entitlements.resolve).toHaveBeenCalledWith(clinicId); expect(response.json().data.entitlements[0]).toMatchObject({ featureKey: FeatureKey.APPOINTMENTS_MANAGE, isEnabled: true }); });
  it('denies cross-tenant entitlement discovery before querying', async () => { const entitlements = service(); await setup(member, entitlements); const response = await app!.inject({ method: 'GET', url: `/v1/entitlements/${otherClinicId}` }); expect(response.statusCode).toBe(403); expect(entitlements.resolve).not.toHaveBeenCalled(); });
  it('requires authentication', async () => { const entitlements = service(); await setup(null, entitlements); const response = await app!.inject({ method: 'GET', url: `/v1/entitlements/${clinicId}` }); expect(response.statusCode).toBe(401); expect(entitlements.resolve).not.toHaveBeenCalled(); });
});
