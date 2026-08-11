import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AdminSubscriptionListService } from '../src/admin/subscriptions-service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: [], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const admin: AuthorizationContext = { user: { id: '11111111-1111-4111-8111-111111111111', email: 'admin@dentra.ph', name: 'Admin', platformRole: 'super_admin' }, strategies: ['superAdmin'], clinicMemberships: [] };
let app: FastifyInstance | undefined; afterEach(async () => { await app?.close(); app = undefined; });
const auth = (context: AuthorizationContext | null): AuthServices => ({ handler: vi.fn(async () => new Response()), getSession: vi.fn(async () => context ? { session: { id: 's', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user } : null), resolveAuthorization: vi.fn(async () => context) });
const service = (): AdminSubscriptionListService => ({ list: vi.fn(async () => ({ items: [{ id: 'sub', clinicId: 'clinic', clinicName: 'Smile Bright', clinicSlug: 'smile-bright', packageId: 'pkg', packageName: 'Professional', packageSlug: 'professional', status: 'active' as const, startsAt: new Date('2026-01-01'), expiresAt: null, createdAt: new Date('2026-01-01'), isCurrent: true }], packageOptions: [{ id: 'pkg', name: 'Professional' }], assignmentPackageOptions: [{ id: 'pkg', name: 'Professional', slug: 'professional' }], pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } })) });
async function setup(context: AuthorizationContext | null, subscriptions: AdminSubscriptionListService) { app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth: auth(context), adminSubscriptions: subscriptions }); }

describe('GET /v1/admin/subscriptions', () => {
  it('requires a Super Admin session before querying', async () => { const subscriptions = service(); await setup(null, subscriptions); const response = await app!.inject({ method: 'GET', url: '/v1/admin/subscriptions' }); expect(response.statusCode).toBe(401); expect(subscriptions.list).not.toHaveBeenCalled(); });
  it('passes validated filters to the subscription ledger', async () => { const subscriptions = service(); await setup(admin, subscriptions); const packageId = '44444444-4444-4444-8444-444444444444'; const response = await app!.inject({ method: 'GET', url: `/v1/admin/subscriptions?search=smile&status=active&packageId=${packageId}&page=1&pageSize=10` }); expect(response.statusCode).toBe(200); expect(subscriptions.list).toHaveBeenCalledWith({ search: 'smile', status: 'active', packageId, page: 1, pageSize: 10 }); expect(response.json().data.items[0].packageName).toBe('Professional'); });
  it('rejects malformed filters', async () => { const subscriptions = service(); await setup(admin, subscriptions); const response = await app!.inject({ method: 'GET', url: '/v1/admin/subscriptions?status=unknown&page=0' }); expect(response.statusCode).toBe(400); expect(subscriptions.list).not.toHaveBeenCalled(); });
});
