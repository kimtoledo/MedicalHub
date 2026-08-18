import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ClinicStaffService } from '../src/clinic/staff-service.js';
import { ClinicStaffError } from '../src/clinic/staff-service.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 3001,
  logLevel: 'silent',
  corsOrigins: ['http://localhost:5000'],
  authSecret: 'test-secret-that-is-at-least-32-characters',
  authBaseUrl: 'http://localhost:3001',
};

const clinicId = '00000000-0001-0000-0000-000000000001';
const membershipId = '66666666-6666-4666-8666-666666666666';

const superAdminContext: AuthorizationContext = {
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'admin@dentra.ph', name: 'Dentra Admin', platformRole: 'super_admin' },
  strategies: ['superAdmin'],
  clinicMemberships: [],
};

const platformSupportContext: AuthorizationContext = {
  user: { id: '44444444-4444-4444-8444-444444444444', email: 'support@dentra.ph', name: 'Dentra Support', platformRole: 'platform_support' },
  strategies: ['superAdmin'],
  clinicMemberships: [],
};

function createAuth(context: AuthorizationContext | null): AuthServices {
  return {
    handler: vi.fn(async () => new Response('{}')),
    getSession: vi.fn(async () => (context ? { session: { id: 's', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user } : null)),
    resolveAuthorization: vi.fn(async () => context),
  };
}

function createStaffService(overrides: Partial<ClinicStaffService> = {}): ClinicStaffService {
  return {
    list: vi.fn(async () => ({ branches: [], dentists: [], permissionKeys: [], members: [] })),
    invite: vi.fn(async () => ({ membershipId, delivery: 'pending_provider' as const })),
    resendInvite: vi.fn(async () => ({ membershipId, delivery: 'pending_provider' as const })),
    update: vi.fn(async () => ({ membershipId })),
    addBranchAssignment: vi.fn(async () => ({ membershipId })),
    remove: vi.fn(async () => ({ membershipId })),
    updatePermission: vi.fn(async () => ({ membershipId, permissionKey: 'patients.manage', isEnabled: true })),
    ...overrides,
  };
}

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function createApp(context: AuthorizationContext | null, staff: ClinicStaffService) {
  app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth: createAuth(context), adminClinicStaff: staff });
}

describe('GET /v1/admin/clinics/:clinicId/staff', () => {
  it('lets a super_admin list staff for any clinic', async () => {
    const staff = createStaffService();
    await createApp(superAdminContext, staff);
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/clinics/${clinicId}/staff` });
    expect(response.statusCode).toBe(200);
    expect(staff.list).toHaveBeenCalledWith(clinicId);
  });

  it('rejects a platform_support account', async () => {
    const staff = createStaffService();
    await createApp(platformSupportContext, staff);
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/clinics/${clinicId}/staff` });
    expect(response.statusCode).toBe(403);
    expect(staff.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    const staff = createStaffService();
    await createApp(null, staff);
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/clinics/${clinicId}/staff` });
    expect(response.statusCode).toBe(401);
    expect(staff.list).not.toHaveBeenCalled();
  });
});

describe('POST /v1/admin/clinics/:clinicId/staff/invitations', () => {
  it('adds a staff member with a synthetic clinic_owner-level actor', async () => {
    const staff = createStaffService();
    await createApp(superAdminContext, staff);
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/staff/invitations`,
      payload: { name: 'New Cashier', email: 'cashier@example.test', role: 'cashier', branchId: null },
    });
    expect(response.statusCode).toBe(201);
    expect(staff.invite).toHaveBeenCalledWith(
      clinicId,
      expect.objectContaining({ role: 'cashier', email: 'cashier@example.test' }),
      expect.objectContaining({ id: superAdminContext.user.id, role: 'clinic_owner' }),
    );
  });

  it('passes the selected dentist profile when creating Dentist access', async () => {
    const staff = createStaffService();
    await createApp(superAdminContext, staff);
    const dentistId = '77777777-7777-4777-8777-777777777777';
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/staff/invitations`,
      payload: { name: 'Dr. Maria Reyes', email: 'maria@example.test', role: 'dentist', branchId: null, dentistId },
    });
    expect(response.statusCode).toBe(201);
    expect(staff.invite).toHaveBeenCalledWith(clinicId, expect.objectContaining({ role: 'dentist', dentistId }), expect.anything());
  });

  it('rejects a platform_support account', async () => {
    const staff = createStaffService();
    await createApp(platformSupportContext, staff);
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/staff/invitations`,
      payload: { name: 'New Cashier', email: 'cashier@example.test', role: 'cashier', branchId: null },
    });
    expect(response.statusCode).toBe(403);
    expect(staff.invite).not.toHaveBeenCalled();
  });

  it('surfaces ClinicStaffError as the mapped status code', async () => {
    const staff = createStaffService({
      invite: vi.fn(async () => { throw new ClinicStaffError('MEMBERSHIP_EXISTS', 'This user already belongs to the clinic', 409); }),
    });
    await createApp(superAdminContext, staff);
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/staff/invitations`,
      payload: { name: 'Dup', email: 'dup@example.test', role: 'cashier', branchId: null },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('MEMBERSHIP_EXISTS');
  });
});

describe('PATCH /v1/admin/clinics/:clinicId/staff/:membershipId', () => {
  it('lets a super_admin change role, branch, or active state', async () => {
    const staff = createStaffService();
    await createApp(superAdminContext, staff);
    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}/staff/${membershipId}`,
      payload: { isActive: false },
    });
    expect(response.statusCode).toBe(200);
    expect(staff.update).toHaveBeenCalledWith(
      clinicId,
      membershipId,
      { isActive: false },
      expect.objectContaining({ id: superAdminContext.user.id, role: 'clinic_owner' }),
    );
  });

  it('rejects a platform_support account', async () => {
    const staff = createStaffService();
    await createApp(platformSupportContext, staff);
    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}/staff/${membershipId}`,
      payload: { isActive: false },
    });
    expect(response.statusCode).toBe(403);
    expect(staff.update).not.toHaveBeenCalled();
  });

  it('surfaces the last-owner-protection error', async () => {
    const staff = createStaffService({
      update: vi.fn(async () => { throw new ClinicStaffError('LAST_OWNER_REQUIRED', 'The clinic must retain at least one active owner', 409); }),
    });
    await createApp(superAdminContext, staff);
    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}/staff/${membershipId}`,
      payload: { isActive: false },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('LAST_OWNER_REQUIRED');
  });
});

describe('DELETE /v1/admin/clinics/:clinicId/staff/:membershipId', () => {
  it('lets a super_admin remove a staff member', async () => {
    const staff = createStaffService();
    await createApp(superAdminContext, staff);
    const response = await app!.inject({ method: 'DELETE', url: `/v1/admin/clinics/${clinicId}/staff/${membershipId}` });
    expect(response.statusCode).toBe(200);
    expect(staff.remove).toHaveBeenCalledWith(clinicId, membershipId, expect.objectContaining({ id: superAdminContext.user.id, role: 'clinic_owner' }));
  });

  it('rejects a platform_support account', async () => {
    const staff = createStaffService();
    await createApp(platformSupportContext, staff);
    const response = await app!.inject({ method: 'DELETE', url: `/v1/admin/clinics/${clinicId}/staff/${membershipId}` });
    expect(response.statusCode).toBe(403);
    expect(staff.remove).not.toHaveBeenCalled();
  });
});
