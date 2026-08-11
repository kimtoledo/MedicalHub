import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import {
  AdminClinicCreationError,
  type AdminClinicCreationService,
  type AdminClinicDetailService,
  type AdminClinicListService,
} from '../src/admin/clinics-service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
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
    })),
  };
}

async function createApp(
  context: AuthorizationContext | null,
  clinics: AdminClinicListService,
  creation?: AdminClinicCreationService,
  details?: AdminClinicDetailService,
) {
  app = await buildApp({
    config,
    checkDatabase: async () => undefined,
    logger: false,
    auth: createAuth(context),
    adminClinics: clinics,
    adminClinicCreation: creation,
    adminClinicDetails: details,
  });
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
