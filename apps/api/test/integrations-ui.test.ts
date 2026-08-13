import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../src/auth/types.js';
import type { IntegrationService } from '../src/integrations/service.js';
import { IntegrationError } from '../src/integrations/service.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const KEY_ID = '44444444-4444-4444-8444-444444444444';
const WEBHOOK_ID = '55555555-5555-4555-8555-555555555555';

function context(role: ClinicRole): AuthorizationContext { return { user: { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test', name: 'Staff', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role, dentistId: null }] }; }
function auth(value: AuthorizationContext): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value) }; }
function integrations(overrides: Record<string, unknown> = {}): IntegrationService { return { listKeys: vi.fn(async () => []), createKey: vi.fn(), revokeKey: vi.fn(), authenticate: vi.fn(async () => null), listWebhooks: vi.fn(async () => []), createWebhook: vi.fn(), disableWebhook: vi.fn(), appointments: vi.fn(async () => []), dispatchEvent: vi.fn(), processDueDeliveries: vi.fn(async () => ({ processed: 0 })), listDeliveries: vi.fn(async () => []), ...overrides } as unknown as IntegrationService; }

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(role: ClinicRole, service: IntegrationService) { app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context(role)), integrations: service }); }

describe('integrations settings UI API', () => {
  it('creates an API key and returns the one-time secret', async () => {
    const service = integrations({ createKey: vi.fn(async () => ({ id: KEY_ID, name: 'Accounting sync', keyPrefix: 'dtk_abc123', scopes: ['appointments.read'], createdAt: new Date('2026-08-13'), secret: 'dtk_abc123fullsecret' })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/integrations/api-keys`, headers: { cookie: 'session=test' }, payload: { name: 'Accounting sync', scopes: ['appointments.read'] } });
    expect(response.statusCode).toBe(201);
    expect(response.json().data.secret).toBe('dtk_abc123fullsecret');
    expect(service.createKey).toHaveBeenCalledWith(CLINIC_ID, 'Accounting sync', ['appointments.read'], expect.objectContaining({ id: '22222222-2222-4222-8222-222222222222' }));
  });

  it('denies API key management for a dentist role', async () => {
    const service = integrations();
    await setup('dentist', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/integrations/api-keys`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(service.listKeys).not.toHaveBeenCalled();
  });

  it('revokes an active API key', async () => {
    const service = integrations({ revokeKey: vi.fn(async () => ({ id: KEY_ID })) });
    await setup('clinic_admin', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/integrations/api-keys/${KEY_ID}/revoke`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(service.revokeKey).toHaveBeenCalled();
  });

  it('rejects revoking an already-revoked key', async () => {
    const service = integrations({ revokeKey: vi.fn(async () => { throw new IntegrationError('KEY_NOT_FOUND', 'Active API key not found', 404); }) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/integrations/api-keys/${KEY_ID}/revoke`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(404);
  });

  it('creates a webhook subscription and returns the one-time signing secret', async () => {
    const service = integrations({ createWebhook: vi.fn(async () => ({ id: WEBHOOK_ID, name: 'Billing sync', endpointUrl: 'https://example.test/hook', eventTypes: ['invoice.paid'], status: 'active' as const, createdAt: new Date('2026-08-13'), secret: 'whsec_fullsecret' })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/integrations/webhooks`, headers: { cookie: 'session=test' }, payload: { name: 'Billing sync', endpointUrl: 'https://example.test/hook', eventTypes: ['invoice.paid'] } });
    expect(response.statusCode).toBe(201);
    expect(response.json().data.secret).toBe('whsec_fullsecret');
  });

  it('disables an active webhook', async () => {
    const service = integrations({ disableWebhook: vi.fn(async () => ({ id: WEBHOOK_ID })) });
    await setup('clinic_admin', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/integrations/webhooks/${WEBHOOK_ID}/disable`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(service.disableWebhook).toHaveBeenCalled();
  });

  it('lists recent delivery attempts for a webhook', async () => {
    const service = integrations({ listDeliveries: vi.fn(async () => [{ id: 'd1', eventType: 'invoice.paid', status: 'delivered' as const, attempts: 1, responseStatus: 200, lastError: null, deliveredAt: new Date('2026-08-13'), createdAt: new Date('2026-08-13') }]) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/integrations/webhooks/${WEBHOOK_ID}/deliveries`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(service.listDeliveries).toHaveBeenCalledWith(CLINIC_ID, WEBHOOK_ID);
  });

  it('denies delivery history access for a dentist role', async () => {
    const service = integrations();
    await setup('dentist', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/integrations/webhooks/${WEBHOOK_ID}/deliveries`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(service.listDeliveries).not.toHaveBeenCalled();
  });

  it('rejects a partner request without an API key', async () => {
    const service = integrations();
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'GET', url: '/v1/partner/appointments' });
    expect(response.statusCode).toBe(401);
  });

  it('rejects a partner request missing the required scope', async () => {
    const service = integrations({ authenticate: vi.fn(async () => ({ clinicId: CLINIC_ID, scopes: ['invoices.read'], keyId: KEY_ID })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'GET', url: '/v1/partner/appointments', headers: { 'x-dentra-api-key': 'dtk_test' } });
    expect(response.statusCode).toBe(403);
  });

  it('returns appointments for an authorized partner key', async () => {
    const service = integrations({ authenticate: vi.fn(async () => ({ clinicId: CLINIC_ID, scopes: ['appointments.read'], keyId: KEY_ID })), appointments: vi.fn(async () => [{ id: 'a1', branchId: 'b1', branchName: 'Main', status: 'booked', startsAt: new Date('2026-08-13T09:00:00Z'), endsAt: null, patientFirstName: 'Ana', patientLastName: 'Cruz', patientNumber: 'SBD-1', serviceName: 'Cleaning' }]) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'GET', url: '/v1/partner/appointments', headers: { 'x-dentra-api-key': 'dtk_test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.appointments).toHaveLength(1);
    expect(response.json().data.clinicId).toBe(CLINIC_ID);
  });
});
