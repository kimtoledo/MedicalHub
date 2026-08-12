import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { ApiConfig } from '../src/config.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { EntitlementService } from '../src/entitlements/service.js';
import type { ClinicInventoryService } from '../src/clinic/inventory-service.js';
import { FeatureKey } from '@dentra/shared';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5000'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333'; const ITEM_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const context: AuthorizationContext = { user: { id: '22222222-2222-4222-8222-222222222222', email: 'inventory@example.test', name: 'Inventory Staff', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role: 'clinic_admin', dentistId: null }] };
function auth(): AuthServices { return { handler: vi.fn(async () => new Response('{}')), getSession: vi.fn(async () => ({ session: { id: '44444444-4444-4444-8444-444444444444', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user })), resolveAuthorization: vi.fn(async () => context) }; }
function entitlements(): EntitlementService { return { resolve: vi.fn(async (clinicId) => ({ clinic: { id: clinicId, name: 'Clinic', status: 'active' }, subscription: null, entitlements: Object.values(FeatureKey).map((featureKey) => ({ featureKey, isEnabled: true, source: 'override' as const, expiresAt: null })) })) }; }
function inventory(overrides: Partial<ClinicInventoryService> = {}): ClinicInventoryService { return { listItems: vi.fn(async () => []), createItem: vi.fn(async () => ({ id: ITEM_ID })), updateItem: vi.fn(async () => ({ id: ITEM_ID })), recordTransaction: vi.fn(async () => ({ id: 'tx', currentStock: '10' })), listTransactions: vi.fn(async () => []), ...overrides }; }
let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });

describe('clinic inventory routes', () => {
  it('creates items and records stock transactions through guarded routes', async () => {
    const service = inventory(); app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(), entitlements: entitlements(), clinicInventory: service });
    const created = await app.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/inventory/items`, headers: { cookie: 'session=test', 'content-type': 'application/json' }, payload: { name: 'Gloves', category: 'PPE', unit: 'box', reorderLevel: '5', isActive: true } });
    expect(created.statusCode).toBe(201);
    const transaction = await app.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/inventory/items/${ITEM_ID}/transactions`, headers: { cookie: 'session=test', 'content-type': 'application/json' }, payload: { direction: 'in', quantity: '10', reason: 'Initial stock', transactionDate: '2026-08-12' } });
    expect(transaction.statusCode).toBe(201); expect(service.recordTransaction).toHaveBeenCalledWith(CLINIC_ID, ITEM_ID, expect.objectContaining({ direction: 'in' }), expect.anything());
  });
  it('rejects malformed stock transactions before service invocation', async () => {
    const service = inventory(); app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(), entitlements: entitlements(), clinicInventory: service });
    const response = await app.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/inventory/items/${ITEM_ID}/transactions`, headers: { cookie: 'session=test' }, payload: { direction: 'out', quantity: '0', reason: '', transactionDate: 'bad' } });
    expect(response.statusCode).toBe(400); expect(service.recordTransaction).not.toHaveBeenCalled();
  });
});
