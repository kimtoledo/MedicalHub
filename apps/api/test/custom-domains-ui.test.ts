import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../src/auth/types.js';
import type { EntitlementService } from '../src/entitlements/service.js';
import type { CustomDomainService } from '../src/domains/service.js';
import { CustomDomainError } from '../src/domains/service.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const DOMAIN_ID = '44444444-4444-4444-8444-444444444444';

function context(role: ClinicRole): AuthorizationContext { return { user: { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test', name: 'Staff', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role, dentistId: null }] }; }
function auth(value: AuthorizationContext): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user })), resolveAuthorization: vi.fn(async () => value) }; }
function domains(overrides: Record<string, unknown> = {}): CustomDomainService { return { add: vi.fn(), list: vi.fn(async () => []), verify: vi.fn(), activate: vi.fn(), ...overrides } as unknown as CustomDomainService; }

const entitlements: EntitlementService = { resolve: vi.fn(async (id) => ({ clinic: { id, name: 'Clinic', status: 'active', maintenanceMode: false }, subscription: null, entitlements: [FeatureKey.CUSTOM_DOMAIN].map((featureKey) => ({ featureKey, isEnabled: true, source: 'package' as const, expiresAt: null })) })) };
let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(role: ClinicRole, service: CustomDomainService) { app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context(role)), entitlements, customDomains: service }); }

describe('custom domain settings UI API', () => {
  it('adds a custom domain and returns DNS instructions', async () => {
    const service = domains({ add: vi.fn(async () => ({ id: DOMAIN_ID, hostname: 'smile.example.ph', verificationToken: 'dentra-domain=abc', status: 'pending_verification' as const, dnsRecord: { type: 'TXT', name: '_dentra-verification', value: 'dentra-domain=abc' } })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/custom-domains`, headers: { cookie: 'session=test' }, payload: { hostname: 'smile.example.ph' } });
    expect(response.statusCode).toBe(201);
    expect(response.json().data.dnsRecord).toEqual({ type: 'TXT', name: '_dentra-verification', value: 'dentra-domain=abc' });
    expect(service.add).toHaveBeenCalledWith(CLINIC_ID, 'smile.example.ph', { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test' });
  });

  it('denies domain management for a non-admin role', async () => {
    const service = domains();
    await setup('dentist', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/custom-domains`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('lists custom domains for the clinic', async () => {
    const service = domains({ list: vi.fn(async () => [{ id: DOMAIN_ID, hostname: 'smile.example.ph', status: 'verified' as const, verifiedAt: new Date('2026-08-01'), activatedAt: null, lastCheckedAt: new Date('2026-08-01'), failureReason: null, verificationToken: 'dentra-domain=abc' }]) });
    await setup('clinic_admin', service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/custom-domains`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(service.list).toHaveBeenCalledWith(CLINIC_ID);
  });

  it('rejects activation before verification succeeds', async () => {
    const service = domains({ activate: vi.fn(async () => { throw new CustomDomainError('DOMAIN_NOT_VERIFIED', 'Verify DNS before activation', 409); }) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/custom-domains/${DOMAIN_ID}/activate`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('DOMAIN_NOT_VERIFIED');
  });

  it('activates a verified domain', async () => {
    const service = domains({ activate: vi.fn(async () => ({ id: DOMAIN_ID, status: 'active' as const })) });
    await setup('clinic_owner', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/custom-domains/${DOMAIN_ID}/activate`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe('active');
  });

  it('surfaces a failed DNS check with a reason', async () => {
    const service = domains({ verify: vi.fn(async () => ({ id: DOMAIN_ID, status: 'failed' as const })) });
    await setup('clinic_admin', service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/custom-domains/${DOMAIN_ID}/verify`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe('failed');
  });
});
