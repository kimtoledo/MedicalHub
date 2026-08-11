import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import { AdminPackageError, type AdminPackageService } from '../src/admin/packages-service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5000'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const superAdmin: AuthorizationContext = { user: { id: '11111111-1111-4111-8111-111111111111', email: 'admin@dentra.ph', name: 'Admin', platformRole: 'super_admin' }, strategies: ['superAdmin'], clinicMemberships: [] };
const clinicMember: AuthorizationContext = { user: { id: '22222222-2222-4222-8222-222222222222', email: 'clinic@test', name: 'Clinic', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: '33333333-3333-4333-8333-333333333333', branchId: null, role: 'clinic_admin', dentistId: null }] };
let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });

function auth(context: AuthorizationContext | null): AuthServices { return { handler: vi.fn(async () => new Response('{}')), getSession: vi.fn(async () => context ? { session: { id: 'session', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user } : null), resolveAuthorization: vi.fn(async () => context) }; }
const item = { id: '44444444-4444-4444-8444-444444444444', name: 'Professional', slug: 'professional', description: 'For growing clinics', priceDisplay: '₱1,499 / month', isActive: true, sortOrder: '1', featureKeys: [FeatureKey.APPOINTMENTS_MANAGE], activeClinicCount: 2 };
function service(): AdminPackageService { return { list: vi.fn(async () => [item]), create: vi.fn(async (input) => ({ ...item, ...input, sortOrder: '0', activeClinicCount: 0 })), update: vi.fn(async (_id, input) => ({ ...item, ...input })) }; }
async function setup(context: AuthorizationContext | null, packages: AdminPackageService) { app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth: auth(context), adminPackages: packages }); }

describe('Super Admin package routes', () => {
  it('protects the package catalog from unauthenticated and clinic users', async () => {
    const packages = service(); await setup(null, packages);
    expect((await app!.inject({ method: 'GET', url: '/v1/admin/packages' })).statusCode).toBe(401);
    await app!.close(); app = undefined; await setup(clinicMember, packages);
    expect((await app!.inject({ method: 'GET', url: '/v1/admin/packages' })).statusCode).toBe(403);
    expect(packages.list).not.toHaveBeenCalled();
  });

  it('returns packages and the canonical FeatureKey catalog', async () => {
    const packages = service(); await setup(superAdmin, packages);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/packages' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.items[0].activeClinicCount).toBe(2);
    expect(response.json().data.featureCatalog).toContain(FeatureKey.APPOINTMENTS_MANAGE);
  });

  it('normalizes and creates a package with canonical features', async () => {
    const packages = service(); await setup(superAdmin, packages);
    const response = await app!.inject({ method: 'POST', url: '/v1/admin/packages', payload: { name: ' Starter ', slug: 'STARTER', description: '', priceDisplay: ' Free ', isActive: true, featureKeys: [FeatureKey.APPOINTMENTS_MANAGE] } });
    expect(response.statusCode).toBe(201);
    expect(packages.create).toHaveBeenCalledWith({ name: 'Starter', slug: 'starter', description: null, priceDisplay: 'Free', isActive: true, featureKeys: [FeatureKey.APPOINTMENTS_MANAGE] }, expect.objectContaining({ id: superAdmin.user.id }));
  });

  it('rejects unknown feature keys and client-injected fields', async () => {
    const packages = service(); await setup(superAdmin, packages);
    const response = await app!.inject({ method: 'POST', url: '/v1/admin/packages', payload: { name: 'Starter', slug: 'starter', priceDisplay: 'Free', isActive: true, featureKeys: ['admin.everything'], clinicId: clinicMember.clinicMemberships[0].clinicId } });
    expect(response.statusCode).toBe(400); expect(packages.create).not.toHaveBeenCalled();
  });

  it('maps duplicate slugs to a conflict', async () => {
    const packages = service(); vi.mocked(packages.create).mockRejectedValueOnce(new AdminPackageError('SLUG_TAKEN', 'Already used')); await setup(superAdmin, packages);
    const response = await app!.inject({ method: 'POST', url: '/v1/admin/packages', payload: { name: 'Starter', slug: 'starter', priceDisplay: 'Free', isActive: true, featureKeys: [] } });
    expect(response.statusCode).toBe(409); expect(response.json().error.code).toBe('SLUG_TAKEN');
  });
});
