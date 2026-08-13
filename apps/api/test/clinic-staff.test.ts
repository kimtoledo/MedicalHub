import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ClinicStaffService } from '../src/clinic/staff-service.js';
import { ClinicStaffError } from '../src/clinic/staff-service.js';
import type { ApiConfig } from '../src/config.js';
import type { EntitlementService } from '../src/entitlements/service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5000'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_CLINIC_ID = '55555555-5555-4555-8555-555555555555';
const MEMBERSHIP_ID = '66666666-6666-4666-8666-666666666666';
const USER_ID = '22222222-2222-4222-8222-222222222222';

function context(role: AuthorizationContext['clinicMemberships'][number]['role'] = 'clinic_owner'): AuthorizationContext {
  return { user: { id: USER_ID, email: 'owner@example.test', name: 'Owner', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role, dentistId: null }] };
}
function auth(value: AuthorizationContext | null): AuthServices {
  return {
    handler: vi.fn(async () => new Response('{}')),
    getSession: vi.fn(async () => value ? ({ session: { id: '44444444-4444-4444-8444-444444444444', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user }) : null),
    resolveAuthorization: vi.fn(async () => value),
  };
}
function entitlements(): EntitlementService {
  return { resolve: vi.fn(async (clinicId) => ({ clinic: { id: clinicId, name: 'Clinic', status: 'active', maintenanceMode: false }, subscription: null, entitlements: Object.values(FeatureKey).map((featureKey) => ({ featureKey, isEnabled: true, source: 'override' as const, expiresAt: null })) })) };
}
function staff(overrides: Partial<ClinicStaffService> = {}): ClinicStaffService {
  return {
    list: vi.fn(async () => ({ branches: [], permissionKeys: [], members: [] })),
    invite: vi.fn(async () => ({ membershipId: MEMBERSHIP_ID, delivery: 'pending_provider' as const })),
    resendInvite: vi.fn(async () => ({ membershipId: MEMBERSHIP_ID, delivery: 'pending_provider' as const })),
    update: vi.fn(async () => ({ membershipId: MEMBERSHIP_ID })),
    addBranchAssignment: vi.fn(async () => ({ membershipId: MEMBERSHIP_ID })),
    remove: vi.fn(async () => ({ membershipId: MEMBERSHIP_ID })),
    updatePermission: vi.fn(async () => ({ membershipId: MEMBERSHIP_ID, permissionKey: 'patients.manage', isEnabled: true })),
    ...overrides,
  };
}

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });

async function setup(authorization: AuthorizationContext | null, service = staff()) {
  app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(authorization), entitlements: entitlements(), clinicStaff: service });
  return service;
}

describe('clinic staff routes', () => {
  it('allows clinic owners to list and invite tenant-scoped staff', async () => {
    const service = await setup(context());
    const list = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/staff`, headers: { cookie: 'session=test' } });
    expect(list.statusCode).toBe(200);
    expect(service.list).toHaveBeenCalledWith(CLINIC_ID);

    const invited = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/staff/invitations`, headers: { cookie: 'session=test' }, payload: { name: 'New Cashier', email: 'cashier@example.test', role: 'cashier', branchId: null } });
    expect(invited.statusCode).toBe(201);
    expect(service.invite).toHaveBeenCalledWith(CLINIC_ID, expect.objectContaining({ role: 'cashier' }), expect.objectContaining({ id: USER_ID, role: 'clinic_owner' }));
  });

  it('denies non-admin and cross-tenant access before calling the service', async () => {
    const service = await setup(context('receptionist'));
    const denied = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/staff`, headers: { cookie: 'session=test' } });
    const crossTenant = await app!.inject({ method: 'GET', url: `/v1/clinic/${OTHER_CLINIC_ID}/staff`, headers: { cookie: 'session=test' } });
    expect(denied.statusCode).toBe(403);
    expect(crossTenant.statusCode).toBe(403);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('validates roles and permission keys at the route boundary', async () => {
    const service = await setup(context());
    const badRole = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/staff/invitations`, headers: { cookie: 'session=test' }, payload: { name: 'Person', email: 'person@example.test', role: 'super_admin', branchId: null } });
    const badPermission = await app!.inject({ method: 'PATCH', url: `/v1/clinic/${CLINIC_ID}/staff/${MEMBERSHIP_ID}/permissions`, headers: { cookie: 'session=test' }, payload: { permissionKey: 'platform.admin', isEnabled: true } });
    expect(badRole.statusCode).toBe(400);
    expect(badPermission.statusCode).toBe(400);
    expect(service.invite).not.toHaveBeenCalled();
    expect(service.updatePermission).not.toHaveBeenCalled();
  });

  it('returns the last-owner conflict without exposing internals', async () => {
    const service = staff({ update: vi.fn(async () => { throw new ClinicStaffError('LAST_OWNER_REQUIRED', 'The clinic must retain at least one active owner', 409); }) });
    await setup(context(), service);
    const response = await app!.inject({ method: 'PATCH', url: `/v1/clinic/${CLINIC_ID}/staff/${MEMBERSHIP_ID}`, headers: { cookie: 'session=test' }, payload: { isActive: false } });
    expect(response.statusCode).toBe(409);
    expect(response.json().error).toEqual({ code: 'LAST_OWNER_REQUIRED', message: 'The clinic must retain at least one active owner' });
  });

  it('adds an additional branch assignment for an existing staff member', async () => {
    const branchId = '77777777-7777-4777-8777-777777777777';
    const service = await setup(context());
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/staff/branch-assignments`, headers: { cookie: 'session=test' }, payload: { userId: USER_ID, branchId } });
    expect(response.statusCode).toBe(201);
    expect(service.addBranchAssignment).toHaveBeenCalledWith(CLINIC_ID, USER_ID, branchId, expect.objectContaining({ id: USER_ID, role: 'clinic_owner' }));
  });

  it('surfaces a conflict when the staff member already covers that branch', async () => {
    const branchId = '77777777-7777-4777-8777-777777777777';
    const service = staff({ addBranchAssignment: vi.fn(async () => { throw new ClinicStaffError('ASSIGNMENT_EXISTS', 'This staff member is already assigned to this branch', 409); }) });
    await setup(context(), service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/staff/branch-assignments`, headers: { cookie: 'session=test' }, payload: { userId: USER_ID, branchId } });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('ASSIGNMENT_EXISTS');
  });

  it('denies non-admin roles from adding a branch assignment', async () => {
    const service = await setup(context('receptionist'));
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/staff/branch-assignments`, headers: { cookie: 'session=test' }, payload: { userId: USER_ID, branchId: '77777777-7777-4777-8777-777777777777' } });
    expect(response.statusCode).toBe(403);
    expect(service.addBranchAssignment).not.toHaveBeenCalled();
  });
});
