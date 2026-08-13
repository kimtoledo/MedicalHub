import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../src/auth/types.js';
import type { NotificationProvidersService } from '../src/notifications/providers-service.js';
import { NotificationProviderError, sendViaSendGrid, sendViaTwilio } from '../src/notifications/providers-service.js';
import { decryptSecret, encryptSecret } from '../src/crypto/secret-box.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';

describe('secret-box domain separation', () => {
  it('round-trips a secret for its own purpose', () => {
    const ciphertext = encryptSecret('purpose-a', 'plaintext-value');
    expect(decryptSecret('purpose-a', ciphertext)).toBe('plaintext-value');
  });

  it('fails to decrypt with a different purpose (domain-separated keys)', () => {
    const ciphertext = encryptSecret('purpose-a', 'plaintext-value');
    expect(decryptSecret('purpose-b', ciphertext)).toBeNull();
  });
});

describe('provider HTTP request shapes', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('sends a correctly shaped SendGrid request', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 202 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await sendViaSendGrid('clinic@example.test', { apiKey: 'SG.test' }, 'patient@example.test', 'Subject', 'Body text');
    expect(fetchMock).toHaveBeenCalledWith('https://api.sendgrid.com/v3/mail/send', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ authorization: 'Bearer SG.test' }) }));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.personalizations[0].to[0].email).toBe('patient@example.test');
    expect(body.from.email).toBe('clinic@example.test');
  });

  it('throws when SendGrid responds with a non-2xx status', async () => {
    global.fetch = vi.fn(async () => new Response(null, { status: 401 })) as unknown as typeof fetch;
    await expect(sendViaSendGrid('clinic@example.test', { apiKey: 'bad' }, 'patient@example.test', 'Subject', 'Body')).rejects.toThrow(/401/);
  });

  it('sends a correctly shaped Twilio request', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 201 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await sendViaTwilio('+15551234567', { accountSid: 'ACxxx', authToken: 'tok' }, '+15559876543', 'Reminder text');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages.json');
    expect(init?.headers).toMatchObject({ authorization: expect.stringContaining('Basic ') });
    const params = new URLSearchParams(init?.body as string);
    expect(params.get('To')).toBe('+15559876543');
    expect(params.get('From')).toBe('+15551234567');
    expect(params.get('Body')).toBe('Reminder text');
  });

  it('throws when Twilio responds with a non-2xx status', async () => {
    global.fetch = vi.fn(async () => new Response(null, { status: 400 })) as unknown as typeof fetch;
    await expect(sendViaTwilio('+15551234567', { accountSid: 'ACxxx', authToken: 'tok' }, '+15559876543', 'x')).rejects.toThrow(/400/);
  });
});

function context(role: ClinicRole): AuthorizationContext { return { user: { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test', name: 'Staff', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role, dentistId: null }] }; }
function auth(value: AuthorizationContext): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value) }; }
function providers(overrides: Record<string, unknown> = {}): NotificationProvidersService { return { status: vi.fn(async () => []), setProvider: vi.fn(), removeProvider: vi.fn(), send: vi.fn(), ...overrides } as unknown as NotificationProvidersService; }

describe('notification provider settings API', () => {
  let app: FastifyInstance | undefined;
  beforeEach(() => { app = undefined; });
  afterEach(async () => { await app?.close(); app = undefined; });
  async function setup(role: ClinicRole, service: NotificationProvidersService) { app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context(role)), notificationProviders: service }); }

  it('connects a SendGrid provider', async () => {
    const service = providers({ setProvider: vi.fn(async () => ({ id: 'p1', channel: 'email' as const, providerName: 'sendgrid' as const, fromAddress: 'clinic@example.test', status: 'active' as const })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'PUT', url: `/v1/clinic/${CLINIC_ID}/notification-providers`, headers: { cookie: 'session=test' }, payload: { channel: 'email', providerName: 'sendgrid', fromAddress: 'clinic@example.test', credential: { apiKey: 'SG.abcdefghij' } } });
    expect(response.statusCode).toBe(201);
    expect(service.setProvider).toHaveBeenCalledWith(CLINIC_ID, 'email', 'sendgrid', { apiKey: 'SG.abcdefghij' }, 'clinic@example.test', expect.objectContaining({ id: '22222222-2222-4222-8222-222222222222' }));
  });

  it('connects a Twilio provider', async () => {
    const service = providers({ setProvider: vi.fn(async () => ({ id: 'p2', channel: 'sms' as const, providerName: 'twilio' as const, fromAddress: '+15551234567', status: 'active' as const })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'PUT', url: `/v1/clinic/${CLINIC_ID}/notification-providers`, headers: { cookie: 'session=test' }, payload: { channel: 'sms', providerName: 'twilio', fromAddress: '+15551234567', credential: { accountSid: 'ACabcdefghij', authToken: 'tokenabcdefghij' } } });
    expect(response.statusCode).toBe(201);
  });

  it('rejects a mismatched channel/providerName combination', async () => {
    const service = providers();
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'PUT', url: `/v1/clinic/${CLINIC_ID}/notification-providers`, headers: { cookie: 'session=test' }, payload: { channel: 'sms', providerName: 'sendgrid', fromAddress: 'x@example.test', credential: { apiKey: 'SG.abcdefghij' } } });
    expect(response.statusCode).toBe(400);
    expect(service.setProvider).not.toHaveBeenCalled();
  });

  it('denies provider management for a dentist role', async () => {
    const service = providers();
    await setup('dentist', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/notification-providers`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(service.status).not.toHaveBeenCalled();
  });

  it('lists configured providers without exposing credentials', async () => {
    const service = providers({ status: vi.fn(async () => [{ id: 'p1', channel: 'email' as const, providerName: 'sendgrid' as const, fromAddress: 'clinic@example.test', status: 'active' as const, lastUsedAt: null, lastError: null, createdAt: new Date('2026-08-13') }]) });
    await setup('clinic_admin', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/notification-providers`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('apiKey');
    expect(response.json().data).toHaveLength(1);
  });

  it('removes a configured provider', async () => {
    const service = providers({ removeProvider: vi.fn(async () => ({ id: 'p1' })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'DELETE', url: `/v1/clinic/${CLINIC_ID}/notification-providers/email`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(service.removeProvider).toHaveBeenCalledWith(CLINIC_ID, 'email', expect.objectContaining({ id: '22222222-2222-4222-8222-222222222222' }));
  });

  it('returns 404 removing a channel with no configured provider', async () => {
    const service = providers({ removeProvider: vi.fn(async () => { throw new NotificationProviderError('PROVIDER_NOT_FOUND', 'No provider configured for this channel', 404); }) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'DELETE', url: `/v1/clinic/${CLINIC_ID}/notification-providers/sms`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(404);
  });
});
