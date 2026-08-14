import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import {
  AdminClinicAccountUpdateError,
  AdminClinicBranchCreationError,
  AdminClinicCreationError,
  AdminClinicStatusError,
  type AdminClinicAccountUpdateService,
  type AdminClinicBranchCreationService,
  type AdminClinicCreationService,
  type AdminClinicDentistsListService,
  type AdminClinicDetailService,
  type AdminClinicListService,
  type AdminClinicMembersListService,
  type AdminClinicPatientsListService,
  type AdminClinicStatusService,
} from '../src/admin/clinics-service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';
import {
  AdminClinicSettingsError,
  type AdminClinicSettingsService,
} from '../src/admin/clinic-settings-service.js';

const config: ApiConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 3001,
  logLevel: 'silent',
  corsOrigins: ['http://localhost:5000'],
  authSecret: 'test-secret-that-is-at-least-32-characters',
  authBaseUrl: 'http://localhost:3001',
};

const superAdminContext: AuthorizationContext = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@dentra.ph',
    name: 'Dentra Admin',
    platformRole: 'super_admin',
  },
  strategies: ['superAdmin'],
  clinicMemberships: [],
};

const platformSupportContext: AuthorizationContext = {
  user: {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'support@dentra.ph',
    name: 'Dentra Support',
    platformRole: 'platform_support',
  },
  strategies: ['superAdmin'],
  clinicMemberships: [],
};

const clinicMemberContext: AuthorizationContext = {
  user: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'clinic@example.test',
    name: 'Clinic User',
    platformRole: null,
  },
  strategies: ['clinicMember'],
  clinicMemberships: [
    {
      clinicId: '33333333-3333-4333-8333-333333333333',
      branchId: null,
      role: 'clinic_admin',
      dentistId: null,
    },
  ],
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function createAuth(context: AuthorizationContext | null): AuthServices {
  return {
    handler: vi.fn(async () => new Response('{}')),
    getSession: vi.fn(async () =>
      context
        ? {
            session: {
              id: '44444444-4444-4444-8444-444444444444',
              userId: context.user.id,
              expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            },
            user: context.user,
          }
        : null),
    resolveAuthorization: vi.fn(async () => context),
  };
}

function createClinicService(): AdminClinicListService {
  return {
    list: vi.fn(async () => ({
      items: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Smile Bright Dental',
          slug: 'smile-bright-dental',
          prefix: 'SBD',
          status: 'active' as const,
          publicationStatus: 'published' as const,
          packageName: 'Professional',
          branchCount: 2,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    })),
  };
}

function createClinicCreationService(): AdminClinicCreationService {
  return {
    listPackageOptions: vi.fn(async () => [
      {
        id: '00000000-0002-0000-0000-000000000001',
        name: 'Professional',
        slug: 'professional',
      },
    ]),
    create: vi.fn(async (input) => ({
      id: '66666666-6666-4666-8666-666666666666',
      name: input.name,
      slug: input.slug,
      prefix: input.prefix,
      status: 'trial' as const,
      ownerUserId: '77777777-7777-4777-8777-777777777777',
      packageId: input.packageId,
      createdAt: new Date('2026-08-11T00:00:00.000Z'),
    })),
  };
}

function createClinicDetailService(): AdminClinicDetailService {
  return {
    getById: vi.fn(async (clinicId) => ({
      id: clinicId,
      name: 'Smile Bright Dental',
      slug: 'smile-bright-dental',
      prefix: 'SBD',
      status: 'active' as const,
      publicationStatus: 'published' as const,
      email: 'hello@smilebrightdental.ph',
      phone: '+63 2 8123 4567',
      website: 'https://smilebrightdental.ph',
      description: 'Family dental clinic',
      logoUrl: null,
      address: '123 Demo Street',
      city: 'Makati',
      province: 'Metro Manila',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      owner: {
        id: '77777777-7777-4777-8777-777777777777',
        name: 'Demo Owner',
        email: 'owner@example.com',
        invitedAt: '2026-01-01T00:00:00.000Z',
        joinedAt: '2026-01-02T00:00:00.000Z',
      },
      branches: [
        {
          id: '88888888-8888-4888-8888-888888888888',
          name: 'Main Branch',
          isMain: true,
          isActive: true,
          phone: '+63 2 8123 4567',
          email: 'main@example.com',
          address: '123 Demo Street',
          city: 'Makati',
          province: 'Metro Manila',
        },
      ],
      subscription: {
        id: '99999999-9999-4999-8999-999999999999',
        status: 'active' as const,
        startsAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: null,
        package: {
          id: '00000000-0002-0000-0000-000000000002',
          name: 'Professional',
          slug: 'professional',
          description: 'Professional package',
        },
      },
      featureOverrides: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          featureKey: 'reports.advanced',
          isEnabled: true,
          reason: 'Pilot access',
          expiresAt: null,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
        },
      ],
      effectiveEntitlements: [
        {
          featureKey: 'appointments.manage',
          isEnabled: true,
          source: 'package' as const,
          reason: null,
          expiresAt: null,
        },
        {
          featureKey: 'reports.advanced',
          isEnabled: true,
          source: 'override' as const,
          reason: 'Pilot access',
          expiresAt: null,
        },
      ],
      availableFeatureKeys: [
        'appointments.manage' as const,
        'reports.advanced' as const,
        'microsite.publish' as const,
      ],
      dentistCount: 2,
      staffCount: 4,
      patientCount: 128,
    })),
  };
}

function createClinicStatusService(): AdminClinicStatusService {
  return {
    updateStatus: vi.fn(async (clinicId, status) => ({
      id: clinicId,
      status,
      updatedAt: new Date('2026-08-11T00:00:00.000Z'),
    })),
  };
}

function createClinicBranchCreationService(): AdminClinicBranchCreationService {
  return {
    create: vi.fn(async (clinicId, input) => ({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      clinicId,
      name: input.name,
      isMain: input.isMain,
      isActive: true,
      phone: input.phone,
      email: input.email,
      address: input.address,
      city: input.city,
      province: input.province,
      createdAt: new Date('2026-08-11T00:00:00.000Z'),
    })),
  };
}

function createClinicSettingsService(): AdminClinicSettingsService {
  return {
    assignPackage: vi.fn(async (clinicId, input) => ({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      clinicId,
      packageId: input.packageId,
      status: 'active' as const,
      startsAt: input.effectiveAt,
      expiresAt: null,
    })),
    setFeatureOverride: vi.fn(async (_clinicId, input) => ({
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      featureKey: input.featureKey,
      isEnabled: input.isEnabled,
      reason: input.reason,
      expiresAt: input.expiresAt,
      createdAt: new Date('2026-08-11T00:00:00.000Z'),
    })),
    removeFeatureOverride: vi.fn(async (_clinicId, overrideId) => ({
      id: overrideId,
      featureKey: 'microsite.publish',
    })),
    updatePublication: vi.fn(async (clinicId, publicationStatus) => ({
      id: clinicId,
      publicationStatus,
      updatedAt: new Date('2026-08-11T00:00:00.000Z'),
    })),
  };
}

async function createApp(
  context: AuthorizationContext | null,
  clinics: AdminClinicListService,
  creation?: AdminClinicCreationService,
  details?: AdminClinicDetailService,
  status?: AdminClinicStatusService,
  branchCreation?: AdminClinicBranchCreationService,
  settings?: AdminClinicSettingsService,
  accountUpdate?: AdminClinicAccountUpdateService,
  dentistsList?: AdminClinicDentistsListService,
  membersList?: AdminClinicMembersListService,
  patientsList?: AdminClinicPatientsListService,
) {
  app = await buildApp({
    config,
    checkDatabase: async () => undefined,
    logger: false,
    auth: createAuth(context),
    adminClinics: clinics,
    adminClinicCreation: creation,
    adminClinicDetails: details,
    adminClinicStatus: status,
    adminClinicBranchCreation: branchCreation,
    adminClinicSettings: settings,
    adminClinicAccountUpdate: accountUpdate,
    adminClinicDentistsList: dentistsList,
    adminClinicMembersList: membersList,
    adminClinicPatientsList: patientsList,
  });
}

function createClinicAccountUpdateService(): AdminClinicAccountUpdateService {
  return {
    update: vi.fn(async (clinicId, input) => ({
      id: clinicId,
      name: input.name ?? 'Smile Bright Dental',
      slug: input.slug ?? 'smile-bright-dental',
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      province: input.province ?? null,
      website: input.website ?? null,
      description: input.description ?? null,
      logoUrl: input.logoUrl ?? null,
      updatedAt: new Date('2026-08-11T00:00:00.000Z'),
    })),
  };
}

function createClinicDentistsListService(): AdminClinicDentistsListService {
  return {
    listDentists: vi.fn(async () => [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        firstName: 'Maria',
        lastName: 'Reyes',
        slug: 'dr-maria-reyes',
        verificationStatus: 'verified' as const,
        publicationStatus: 'published',
        branchNames: ['Main Branch'],
      },
    ]),
  };
}

function createClinicMembersListService(): AdminClinicMembersListService {
  return {
    listMembers: vi.fn(async () => [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        userId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        name: 'Demo Owner',
        email: 'owner@example.com',
        role: 'clinic_owner' as const,
        branchId: null,
        branchName: null,
        isActive: true,
        joinedAt: '2026-01-02T00:00:00.000Z',
      },
    ]),
  };
}

function createClinicPatientsListService(): AdminClinicPatientsListService {
  return {
    listPatients: vi.fn(async (clinicId, input) => ({
      items: [
        {
          id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          patientNumber: 'SBD000001',
          firstName: 'Ana',
          lastName: 'Cruz',
          phone: '+63 917 000 0000',
          email: null,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
        },
      ],
      pagination: { page: input.page, pageSize: input.pageSize, total: 1, totalPages: 1 },
    })),
  };
}

describe('GET /v1/admin/clinics', () => {
  it('rejects unauthenticated requests before querying clinics', async () => {
    const clinics = createClinicService();
    await createApp(null, clinics);

    const response = await app!.inject({ method: 'GET', url: '/v1/admin/clinics' });

    expect(response.statusCode).toBe(401);
    expect(clinics.list).not.toHaveBeenCalled();
  });

  it('rejects authenticated clinic members', async () => {
    const clinics = createClinicService();
    await createApp(clinicMemberContext, clinics);

    const response = await app!.inject({ method: 'GET', url: '/v1/admin/clinics' });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
    expect(clinics.list).not.toHaveBeenCalled();
  });

  it('returns paginated clinic data for a Super Admin', async () => {
    const clinics = createClinicService();
    await createApp(superAdminContext, clinics);

    const response = await app!.inject({
      method: 'GET',
      url: '/v1/admin/clinics?search=smile&status=active&page=1&pageSize=10',
    });

    expect(response.statusCode).toBe(200);
    expect(clinics.list).toHaveBeenCalledWith({
      search: 'smile',
      status: 'active',
      page: 1,
      pageSize: 10,
    });
    expect(response.json().data.items[0]).toMatchObject({
      name: 'Smile Bright Dental',
      packageName: 'Professional',
      branchCount: 2,
    });
  });

  it('rejects invalid pagination without querying clinics', async () => {
    const clinics = createClinicService();
    await createApp(superAdminContext, clinics);

    const response = await app!.inject({
      method: 'GET',
      url: '/v1/admin/clinics?page=0',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(clinics.list).not.toHaveBeenCalled();
  });
});

describe('Super Admin clinic onboarding', () => {
  it('returns active package options to a Super Admin', async () => {
    const creation = createClinicCreationService();
    await createApp(superAdminContext, createClinicService(), creation);

    const response = await app!.inject({
      method: 'GET',
      url: '/v1/admin/packages/options',
    });

    expect(response.statusCode).toBe(200);
    expect(creation.listPackageOptions).toHaveBeenCalledOnce();
    expect(response.json().data).toEqual([
      {
        id: '00000000-0002-0000-0000-000000000001',
        name: 'Professional',
        slug: 'professional',
      },
    ]);
  });

  it('rejects unauthenticated clinic creation before writing data', async () => {
    const creation = createClinicCreationService();
    await createApp(null, createClinicService(), creation);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/admin/clinics',
      payload: {},
    });

    expect(response.statusCode).toBe(401);
    expect(creation.create).not.toHaveBeenCalled();
  });

  it('rejects clinic members attempting to create another tenant', async () => {
    const creation = createClinicCreationService();
    await createApp(clinicMemberContext, createClinicService(), creation);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/admin/clinics',
      payload: {},
    });

    expect(response.statusCode).toBe(403);
    expect(creation.create).not.toHaveBeenCalled();
  });

  it('validates and normalizes clinic creation input', async () => {
    const creation = createClinicCreationService();
    await createApp(superAdminContext, createClinicService(), creation);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/admin/clinics',
      payload: {
        name: '  Pearl Dental Studio  ',
        slug: 'PEARL-DENTAL',
        prefix: 'pds',
        ownerEmail: 'OWNER@EXAMPLE.COM',
        packageId: '00000000-0002-0000-0000-000000000001',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(creation.create).toHaveBeenCalledWith(
      {
        name: 'Pearl Dental Studio',
        slug: 'pearl-dental',
        prefix: 'PDS',
        ownerEmail: 'owner@example.com',
        packageId: '00000000-0002-0000-0000-000000000001',
      },
      {
        id: superAdminContext.user.id,
        email: superAdminContext.user.email,
      },
    );
    expect(response.json().data).toMatchObject({
      name: 'Pearl Dental Studio',
      status: 'trial',
    });
  });

  it('rejects malformed clinic fields before writing data', async () => {
    const creation = createClinicCreationService();
    await createApp(superAdminContext, createClinicService(), creation);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/admin/clinics',
      payload: {
        name: 'A',
        slug: 'not a slug',
        prefix: '!',
        ownerEmail: 'not-an-email',
        packageId: 'not-a-uuid',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(creation.create).not.toHaveBeenCalled();
  });

  it('returns a conflict for an existing clinic slug', async () => {
    const creation = createClinicCreationService();
    vi.mocked(creation.create).mockRejectedValueOnce(
      new AdminClinicCreationError(
        'SLUG_TAKEN',
        'That clinic slug is already in use',
      ),
    );
    await createApp(superAdminContext, createClinicService(), creation);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/admin/clinics',
      payload: {
        name: 'Pearl Dental Studio',
        slug: 'pearl-dental',
        prefix: 'PDS',
        ownerEmail: 'owner@example.com',
        packageId: '00000000-0002-0000-0000-000000000001',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('SLUG_TAKEN');
  });
});

describe('GET /v1/admin/clinics/:clinicId', () => {
  const clinicId = '00000000-0001-0000-0000-000000000001';

  it('rejects unauthenticated detail requests before querying data', async () => {
    const details = createClinicDetailService();
    await createApp(null, createClinicService(), undefined, details);

    const response = await app!.inject({
      method: 'GET',
      url: `/v1/admin/clinics/${clinicId}`,
    });

    expect(response.statusCode).toBe(401);
    expect(details.getById).not.toHaveBeenCalled();
  });

  it('rejects clinic members attempting to inspect platform clinic data', async () => {
    const details = createClinicDetailService();
    await createApp(clinicMemberContext, createClinicService(), undefined, details);

    const response = await app!.inject({
      method: 'GET',
      url: `/v1/admin/clinics/${clinicId}`,
    });

    expect(response.statusCode).toBe(403);
    expect(details.getById).not.toHaveBeenCalled();
  });

  it('rejects malformed clinic identifiers before querying data', async () => {
    const details = createClinicDetailService();
    await createApp(superAdminContext, createClinicService(), undefined, details);

    const response = await app!.inject({
      method: 'GET',
      url: '/v1/admin/clinics/not-a-uuid',
    });

    expect(response.statusCode).toBe(400);
    expect(details.getById).not.toHaveBeenCalled();
  });

  it('returns not found when the clinic does not exist', async () => {
    const details = createClinicDetailService();
    vi.mocked(details.getById).mockResolvedValueOnce(null);
    await createApp(superAdminContext, createClinicService(), undefined, details);

    const response = await app!.inject({
      method: 'GET',
      url: `/v1/admin/clinics/${clinicId}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('CLINIC_NOT_FOUND');
  });

  it('returns management details and effective entitlements to a Super Admin', async () => {
    const details = createClinicDetailService();
    await createApp(superAdminContext, createClinicService(), undefined, details);

    const response = await app!.inject({
      method: 'GET',
      url: `/v1/admin/clinics/${clinicId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(details.getById).toHaveBeenCalledWith(clinicId);
    expect(response.json().data).toMatchObject({
      name: 'Smile Bright Dental',
      owner: { email: 'owner@example.com' },
      subscription: { package: { name: 'Professional' } },
      effectiveEntitlements: [
        { featureKey: 'appointments.manage', source: 'package' },
        { featureKey: 'reports.advanced', source: 'override' },
      ],
    });
  });
});

describe('PATCH /v1/admin/clinics/:clinicId/status', () => {
  const clinicId = '00000000-0001-0000-0000-000000000001';

  it('rejects unauthenticated status updates before writing data', async () => {
    const status = createClinicStatusService();
    await createApp(null, createClinicService(), undefined, undefined, status);

    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}/status`,
      payload: { status: 'suspended' },
    });

    expect(response.statusCode).toBe(401);
    expect(status.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects clinic members attempting to change tenant status', async () => {
    const status = createClinicStatusService();
    await createApp(
      clinicMemberContext,
      createClinicService(),
      undefined,
      undefined,
      status,
    );

    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}/status`,
      payload: { status: 'archived' },
    });

    expect(response.statusCode).toBe(403);
    expect(status.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects invalid identifiers and unsupported target statuses', async () => {
    const status = createClinicStatusService();
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      status,
    );

    const invalidId = await app!.inject({
      method: 'PATCH',
      url: '/v1/admin/clinics/not-a-uuid/status',
      payload: { status: 'active' },
    });
    const invalidStatus = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}/status`,
      payload: { status: 'trial' },
    });

    expect(invalidId.statusCode).toBe(400);
    expect(invalidStatus.statusCode).toBe(400);
    expect(status.updateStatus).not.toHaveBeenCalled();
  });

  it('updates status as the authenticated Super Admin', async () => {
    const status = createClinicStatusService();
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      status,
    );

    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}/status`,
      headers: { 'user-agent': 'Dentra API test' },
      payload: { status: 'suspended' },
    });

    expect(response.statusCode).toBe(200);
    expect(status.updateStatus).toHaveBeenCalledWith(
      clinicId,
      'suspended',
      expect.objectContaining({
        id: superAdminContext.user.id,
        email: superAdminContext.user.email,
        userAgent: 'Dentra API test',
      }),
    );
    expect(response.json().data.status).toBe('suspended');
  });

  it.each([
    ['CLINIC_NOT_FOUND', 404],
    ['INVALID_STATUS_TRANSITION', 409],
  ] as const)('maps %s service failures to HTTP %i', async (code, httpStatus) => {
    const status = createClinicStatusService();
    vi.mocked(status.updateStatus).mockRejectedValueOnce(
      new AdminClinicStatusError(code, 'Status update rejected'),
    );
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      status,
    );

    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}/status`,
      payload: { status: 'active' },
    });

    expect(response.statusCode).toBe(httpStatus);
    expect(response.json().error.code).toBe(code);
  });
});

describe('POST /v1/admin/clinics/:clinicId/branches', () => {
  const clinicId = '00000000-0001-0000-0000-000000000001';
  const validPayload = {
    name: '  BGC Branch  ',
    isMain: false,
    phone: '',
    email: 'BGC@EXAMPLE.PH',
    address: '  123 High Street  ',
    city: 'Taguig',
    province: 'Metro Manila',
  };

  it('rejects unauthenticated branch creation before writing data', async () => {
    const branchCreation = createClinicBranchCreationService();
    await createApp(
      null,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      branchCreation,
    );

    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/branches`,
      payload: validPayload,
    });

    expect(response.statusCode).toBe(401);
    expect(branchCreation.create).not.toHaveBeenCalled();
  });

  it('rejects clinic members attempting to create branches', async () => {
    const branchCreation = createClinicBranchCreationService();
    await createApp(
      clinicMemberContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      branchCreation,
    );

    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/branches`,
      payload: validPayload,
    });

    expect(response.statusCode).toBe(403);
    expect(branchCreation.create).not.toHaveBeenCalled();
  });

  it('rejects malformed IDs, invalid fields, and client-supplied tenant IDs', async () => {
    const branchCreation = createClinicBranchCreationService();
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      branchCreation,
    );

    const invalidId = await app!.inject({
      method: 'POST',
      url: '/v1/admin/clinics/not-a-uuid/branches',
      payload: validPayload,
    });
    const invalidBody = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/branches`,
      payload: { ...validPayload, name: 'A', email: 'not-an-email' },
    });
    const injectedTenant = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/branches`,
      payload: {
        ...validPayload,
        clinicId: '99999999-9999-4999-8999-999999999999',
      },
    });

    expect(invalidId.statusCode).toBe(400);
    expect(invalidBody.statusCode).toBe(400);
    expect(injectedTenant.statusCode).toBe(400);
    expect(branchCreation.create).not.toHaveBeenCalled();
  });

  it('normalizes input and scopes creation to the route clinic', async () => {
    const branchCreation = createClinicBranchCreationService();
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      branchCreation,
    );

    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/branches`,
      headers: { 'user-agent': 'Dentra API test' },
      payload: validPayload,
    });

    expect(response.statusCode).toBe(201);
    expect(branchCreation.create).toHaveBeenCalledWith(
      clinicId,
      {
        name: 'BGC Branch',
        isMain: false,
        phone: null,
        email: 'bgc@example.ph',
        address: '123 High Street',
        city: 'Taguig',
        province: 'Metro Manila',
      },
      expect.objectContaining({
        id: superAdminContext.user.id,
        email: superAdminContext.user.email,
        userAgent: 'Dentra API test',
      }),
    );
    expect(response.json().data).toMatchObject({
      clinicId,
      name: 'BGC Branch',
    });
  });

  it.each([
    ['CLINIC_NOT_FOUND', 404],
    ['MAIN_BRANCH_EXISTS', 409],
  ] as const)('maps %s service failures to HTTP %i', async (code, httpStatus) => {
    const branchCreation = createClinicBranchCreationService();
    vi.mocked(branchCreation.create).mockRejectedValueOnce(
      new AdminClinicBranchCreationError(code, 'Branch creation rejected'),
    );
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      branchCreation,
    );

    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/branches`,
      payload: validPayload,
    });

    expect(response.statusCode).toBe(httpStatus);
    expect(response.json().error.code).toBe(code);
  });
});

describe('Super Admin clinic package, override, and publication settings', () => {
  const clinicId = '00000000-0001-0000-0000-000000000001';
  const packageId = '00000000-0002-0000-0000-000000000001';
  const overrideId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const effectiveDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Manila',
  }).format(new Date());

  it('rejects unauthenticated package assignment before writing data', async () => {
    const settings = createClinicSettingsService();
    await createApp(
      null,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      undefined,
      settings,
    );
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/package`,
      payload: { packageId, effectiveDate },
    });
    expect(response.statusCode).toBe(401);
    expect(settings.assignPackage).not.toHaveBeenCalled();
  });

  it.each([
    ['POST', 'feature-overrides', { featureKey: 'reports.advanced', isEnabled: true, reason: 'Pilot access' }],
    ['DELETE', `feature-overrides/${overrideId}`, undefined],
    ['PATCH', 'publication', { publicationStatus: 'published' }],
  ] as const)('rejects clinic members calling %s %s', async (method, path, payload) => {
    const settings = createClinicSettingsService();
    await createApp(
      clinicMemberContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      undefined,
      settings,
    );
    const response = await app!.inject({
      method,
      url: `/v1/admin/clinics/${clinicId}/${path}`,
      payload,
    });
    expect(response.statusCode).toBe(403);
  });

  it('validates package dates, feature keys, override IDs, and publication states', async () => {
    const settings = createClinicSettingsService();
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      undefined,
      settings,
    );
    const invalidPackage = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/package`,
      payload: { packageId, effectiveDate: '2000-01-01' },
    });
    const invalidFeature = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/feature-overrides`,
      payload: { featureKey: 'unknown.feature', isEnabled: true, reason: 'Testing' },
    });
    const invalidOverride = await app!.inject({
      method: 'DELETE',
      url: `/v1/admin/clinics/${clinicId}/feature-overrides/not-a-uuid`,
    });
    const invalidPublication = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}/publication`,
      payload: { publicationStatus: 'draft' },
    });
    expect(invalidPackage.statusCode).toBe(400);
    expect(invalidFeature.statusCode).toBe(400);
    expect(invalidOverride.statusCode).toBe(400);
    expect(invalidPublication.statusCode).toBe(400);
  });

  it('assigns a package using the route clinic and Manila effective date', async () => {
    const settings = createClinicSettingsService();
    await createApp(superAdminContext, createClinicService(), undefined, undefined, undefined, undefined, settings);
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/package`,
      payload: { packageId, effectiveDate },
    });
    expect(response.statusCode).toBe(201);
    expect(settings.assignPackage).toHaveBeenCalledWith(
      clinicId,
      expect.objectContaining({
        packageId,
        effectiveAt: expect.any(Date),
      }),
      expect.objectContaining({ id: superAdminContext.user.id }),
    );
  });

  it('sets and removes a validated feature override', async () => {
    const settings = createClinicSettingsService();
    await createApp(superAdminContext, createClinicService(), undefined, undefined, undefined, undefined, settings);
    const createResponse = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/feature-overrides`,
      payload: {
        featureKey: 'reports.advanced',
        isEnabled: true,
        reason: '  Approved pilot access  ',
        expiresAt: null,
      },
    });
    const removeResponse = await app!.inject({
      method: 'DELETE',
      url: `/v1/admin/clinics/${clinicId}/feature-overrides/${overrideId}`,
    });
    expect(createResponse.statusCode).toBe(201);
    expect(settings.setFeatureOverride).toHaveBeenCalledWith(
      clinicId,
      {
        featureKey: 'reports.advanced',
        isEnabled: true,
        reason: 'Approved pilot access',
        expiresAt: null,
      },
      expect.objectContaining({ id: superAdminContext.user.id }),
    );
    expect(removeResponse.statusCode).toBe(200);
    expect(settings.removeFeatureOverride).toHaveBeenCalledWith(
      clinicId,
      overrideId,
      expect.objectContaining({ id: superAdminContext.user.id }),
    );
  });

  it('publishes the route clinic as a Super Admin', async () => {
    const settings = createClinicSettingsService();
    await createApp(superAdminContext, createClinicService(), undefined, undefined, undefined, undefined, settings);
    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}/publication`,
      payload: { publicationStatus: 'published' },
    });
    expect(response.statusCode).toBe(200);
    expect(settings.updatePublication).toHaveBeenCalledWith(
      clinicId,
      'published',
      expect.objectContaining({ id: superAdminContext.user.id }),
    );
  });

  it.each([
    ['CLINIC_NOT_FOUND', 404],
    ['PACKAGE_NOT_AVAILABLE', 400],
    ['PACKAGE_ALREADY_ASSIGNED', 409],
    ['FUTURE_ASSIGNMENT_EXISTS', 409],
  ] as const)('maps package error %s to HTTP %i', async (code, statusCode) => {
    const settings = createClinicSettingsService();
    vi.mocked(settings.assignPackage).mockRejectedValueOnce(
      new AdminClinicSettingsError(code, 'Package assignment rejected'),
    );
    await createApp(superAdminContext, createClinicService(), undefined, undefined, undefined, undefined, settings);
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/admin/clinics/${clinicId}/package`,
      payload: { packageId, effectiveDate },
    });
    expect(response.statusCode).toBe(statusCode);
    expect(response.json().error.code).toBe(code);
  });
});

describe('PATCH /v1/admin/clinics/:clinicId', () => {
  const clinicId = '00000000-0001-0000-0000-000000000001';

  it('lets a super_admin update account info fields', async () => {
    const accountUpdate = createClinicAccountUpdateService();
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      accountUpdate,
    );
    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}`,
      payload: { name: 'Smile Bright Dental Clinic', phone: '+63 2 8000 0000' },
    });
    expect(response.statusCode).toBe(200);
    expect(accountUpdate.update).toHaveBeenCalledWith(
      clinicId,
      expect.objectContaining({ name: 'Smile Bright Dental Clinic', phone: '+63 2 8000 0000' }),
      expect.objectContaining({ id: superAdminContext.user.id }),
    );
  });

  it('rejects a platform_support account from updating account info', async () => {
    const accountUpdate = createClinicAccountUpdateService();
    await createApp(
      platformSupportContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      accountUpdate,
    );
    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}`,
      payload: { name: 'Smile Bright Dental Clinic' },
    });
    expect(response.statusCode).toBe(403);
    expect(accountUpdate.update).not.toHaveBeenCalled();
  });

  it('returns 409 SLUG_TAKEN when the new slug is already in use', async () => {
    const accountUpdate = createClinicAccountUpdateService();
    vi.mocked(accountUpdate.update).mockRejectedValueOnce(
      new AdminClinicAccountUpdateError('SLUG_TAKEN', 'That clinic slug is already in use'),
    );
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      accountUpdate,
    );
    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}`,
      payload: { slug: 'already-taken' },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('SLUG_TAKEN');
  });

  it('returns 409 SLUG_LOCKED when changing the slug of a published clinic', async () => {
    const accountUpdate = createClinicAccountUpdateService();
    vi.mocked(accountUpdate.update).mockRejectedValueOnce(
      new AdminClinicAccountUpdateError(
        'SLUG_LOCKED',
        'The clinic slug cannot change once the microsite has been published',
      ),
    );
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      accountUpdate,
    );
    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}`,
      payload: { slug: 'new-slug' },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('SLUG_LOCKED');
  });

  it('returns 404 when the clinic does not exist', async () => {
    const accountUpdate = createClinicAccountUpdateService();
    vi.mocked(accountUpdate.update).mockRejectedValueOnce(
      new AdminClinicAccountUpdateError('CLINIC_NOT_FOUND', 'Clinic not found'),
    );
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      accountUpdate,
    );
    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/admin/clinics/${clinicId}`,
      payload: { name: 'Anything' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('CLINIC_NOT_FOUND');
  });
});

describe('GET /v1/admin/clinics/:clinicId/dentists', () => {
  const clinicId = '00000000-0001-0000-0000-000000000001';

  it('lets a super_admin list dentists affiliated with a clinic', async () => {
    const dentistsList = createClinicDentistsListService();
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined, undefined, undefined, undefined, undefined, undefined,
      dentistsList,
    );
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/clinics/${clinicId}/dentists` });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(dentistsList.listDentists).toHaveBeenCalledWith(clinicId);
  });

  it('rejects a platform_support account', async () => {
    const dentistsList = createClinicDentistsListService();
    await createApp(
      platformSupportContext,
      createClinicService(),
      undefined, undefined, undefined, undefined, undefined, undefined,
      dentistsList,
    );
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/clinics/${clinicId}/dentists` });
    expect(response.statusCode).toBe(403);
    expect(dentistsList.listDentists).not.toHaveBeenCalled();
  });
});

describe('GET /v1/admin/clinics/:clinicId/members', () => {
  const clinicId = '00000000-0001-0000-0000-000000000001';

  it('lets a super_admin list clinic staff', async () => {
    const membersList = createClinicMembersListService();
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      membersList,
    );
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/clinics/${clinicId}/members` });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(membersList.listMembers).toHaveBeenCalledWith(clinicId);
  });

  it('rejects a platform_support account', async () => {
    const membersList = createClinicMembersListService();
    await createApp(
      platformSupportContext,
      createClinicService(),
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      membersList,
    );
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/clinics/${clinicId}/members` });
    expect(response.statusCode).toBe(403);
    expect(membersList.listMembers).not.toHaveBeenCalled();
  });
});

describe('GET /v1/admin/clinics/:clinicId/patients', () => {
  const clinicId = '00000000-0001-0000-0000-000000000001';

  it('lets a super_admin list patients with pagination forwarded to the service', async () => {
    const patientsList = createClinicPatientsListService();
    await createApp(
      superAdminContext,
      createClinicService(),
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      patientsList,
    );
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/clinics/${clinicId}/patients?page=2&pageSize=50` });
    expect(response.statusCode).toBe(200);
    expect(patientsList.listPatients).toHaveBeenCalledWith(clinicId, { page: 2, pageSize: 50 });
  });

  it('rejects a platform_support account', async () => {
    const patientsList = createClinicPatientsListService();
    await createApp(
      platformSupportContext,
      createClinicService(),
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      patientsList,
    );
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/clinics/${clinicId}/patients` });
    expect(response.statusCode).toBe(403);
    expect(patientsList.listPatients).not.toHaveBeenCalled();
  });
});
