import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../src/auth/types.js';
import type { PaymentService } from '../src/payments/service.js';
import { PaymentError } from '../src/payments/service.js';
import type { ApiConfig } from '../src/config.js';
import type { EntitlementService } from '../src/entitlements/service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const INVOICE_ID = '44444444-4444-4444-8444-444444444444';
const LINK_ID = '55555555-5555-4555-8555-555555555555';

function context(role: ClinicRole): AuthorizationContext { return { user: { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test', name: 'Staff', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role, dentistId: null }] }; }
function auth(value: AuthorizationContext): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value) }; }
function entitlements(enabled = true): EntitlementService { return { resolve: vi.fn(async () => ({ clinic: { id: CLINIC_ID, name: 'Clinic', status: 'active', maintenanceMode: false }, subscription: null, entitlements: [{ featureKey: FeatureKey.BILLING_PAYMENTS, isEnabled: enabled, source: 'override' as const, expiresAt: null }] })) }; }
function payments(overrides: Partial<PaymentService> = {}): PaymentService { return { createLink: vi.fn(), getLink: vi.fn(), listLinks: vi.fn(async () => []), cancelLink: vi.fn(), verifySignature: vi.fn(), webhook: vi.fn(), ...overrides } as unknown as PaymentService; }

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(role: ClinicRole, service: PaymentService, enabled = true) { app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context(role)), entitlements: entitlements(enabled), payments: service }); }

describe('online payment link management', () => {
  it('creates a payment link for an authorized role', async () => {
    const service = payments({ createLink: vi.fn(async () => ({ id: LINK_ID, token: 'raw-token', amountPhp: '500.00', expiresAt: new Date('2026-08-20') })) });
    await setup('cashier', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/payment-link`, headers: { cookie: 'session=test' }, payload: { expiresAt: '2026-08-20T00:00:00+08:00' } });
    expect(response.statusCode).toBe(201);
    expect(service.createLink).toHaveBeenCalledWith(CLINIC_ID, INVOICE_ID, new Date('2026-08-20T00:00:00+08:00'), { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test' });
  });

  it('denies payment-link creation for a dentist role', async () => {
    const service = payments();
    await setup('dentist', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/payment-link`, headers: { cookie: 'session=test' }, payload: { expiresAt: '2026-08-20T00:00:00+08:00' } });
    expect(response.statusCode).toBe(403);
    expect(service.createLink).not.toHaveBeenCalled();
  });

  it('enforces the billing.payments entitlement', async () => {
    const service = payments();
    await setup('clinic_admin', service, false);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/payment-link`, headers: { cookie: 'session=test' }, payload: { expiresAt: '2026-08-20T00:00:00+08:00' } });
    expect(response.statusCode).toBe(403);
    expect(service.createLink).not.toHaveBeenCalled();
  });

  it('lists payment links for an invoice', async () => {
    const service = payments({ listLinks: vi.fn(async () => [{ id: LINK_ID, amountPhp: '500.00', status: 'active' as const, expiresAt: new Date('2026-08-20'), createdAt: new Date('2026-08-13') }]) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/payment-links`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(service.listLinks).toHaveBeenCalledWith(CLINIC_ID, INVOICE_ID);
    expect(response.json().data).toHaveLength(1);
  });

  it('cancels an active payment link', async () => {
    const service = payments({ cancelLink: vi.fn(async () => ({ id: LINK_ID, status: 'cancelled' as const })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/payment-links/${LINK_ID}/cancel`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(service.cancelLink).toHaveBeenCalledWith(CLINIC_ID, LINK_ID, { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test' });
  });

  it('rejects cancelling a link that is not active', async () => {
    const service = payments({ cancelLink: vi.fn(async () => { throw new PaymentError('INVALID_STATE', 'Only active payment links can be cancelled', 409); }) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/payment-links/${LINK_ID}/cancel`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('INVALID_STATE');
  });
});

describe('public payment link status page', () => {
  it('returns link status without authentication', async () => {
    const service = payments({ getLink: vi.fn(async () => ({ id: LINK_ID, clinicId: CLINIC_ID, invoiceId: INVOICE_ID, amountPhp: '500.00', status: 'active' as const, expiresAt: new Date('2026-08-20'), invoiceNumber: 'INV-0001', lastAttempt: null })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'GET', url: '/v1/public/payment-links/a-valid-looking-token-value-1234567890' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe('active');
  });

  it('returns 404 for an unknown token', async () => {
    const service = payments({ getLink: vi.fn(async () => { throw new PaymentError('LINK_NOT_FOUND', 'Payment link not found', 404); }) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'GET', url: '/v1/public/payment-links/a-valid-looking-token-value-1234567890' });
    expect(response.statusCode).toBe(404);
  });
});

describe('payment webhook idempotency', () => {
  it('rejects a webhook with an invalid signature', async () => {
    const service = payments({ webhook: vi.fn(async () => { throw new PaymentError('INVALID_SIGNATURE', 'Webhook signature is invalid', 401); }) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'POST', url: '/v1/public/payment-webhooks/gcash', headers: { 'x-dentra-payment-signature': 'bad-signature' }, payload: { eventId: 'evt_123', eventType: 'payment', paymentId: 'pay_123', linkToken: 'a-valid-looking-token-value-1234567890', amountPhp: '500.00', success: true } });
    expect(response.statusCode).toBe(401);
  });

  it('treats a replayed event id as a no-op duplicate', async () => {
    const service = payments({ webhook: vi.fn(async () => ({ duplicate: true, status: null })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'POST', url: '/v1/public/payment-webhooks/gcash', headers: { 'x-dentra-payment-signature': 'sig' }, payload: { eventId: 'evt_123', eventType: 'payment', paymentId: 'pay_123', linkToken: 'a-valid-looking-token-value-1234567890', amountPhp: '500.00', success: true } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.duplicate).toBe(true);
  });
});
