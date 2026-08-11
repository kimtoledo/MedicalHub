import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import {
  AdminDentistCreationError,
  type AdminDentistCreationService,
  type AdminDentistListService,
} from '../src/admin/dentists-service.js';
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

function createDentistService(): AdminDentistListService {
  return {
    list: vi.fn(async () => ({
      items: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          firstName: 'Maria',
          lastName: 'Reyes',
          slug: 'dr-maria-reyes',
          licenseNumber: 'PRC-1234567',
          specialty: 'Orthodontics',
          verificationStatus: 'verified' as const,
          publicationStatus: 'published',
          affiliatedClinicCount: 2,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    })),
  };
}

function createDentistCreationService(): AdminDentistCreationService {
  return {
    create: vi.fn(async (input) => ({
      id: '66666666-6666-4666-8666-666666666666',
      ...input,
      verificationStatus: 'unverified' as const,
      publicationStatus: 'draft',
      createdAt: new Date('2026-08-12T00:00:00.000Z'),
    })),
  };
}

async function createApp(
  context: AuthorizationContext | null,
  dentists: AdminDentistListService,
  creation?: AdminDentistCreationService,
) {
  app = await buildApp({
    config,
    checkDatabase: async () => undefined,
    logger: false,
    auth: createAuth(context),
    adminDentists: dentists,
    adminDentistCreation: creation,
  });
}

describe('GET /v1/admin/dentists', () => {
  it('rejects unauthenticated requests before querying dentists', async () => {
    const dentists = createDentistService();
    await createApp(null, dentists);

    const response = await app!.inject({
      method: 'GET',
      url: '/v1/admin/dentists',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHENTICATED');
    expect(dentists.list).not.toHaveBeenCalled();
  });

  it('rejects authenticated clinic members', async () => {
    const dentists = createDentistService();
    await createApp(clinicMemberContext, dentists);

    const response = await app!.inject({
      method: 'GET',
      url: '/v1/admin/dentists',
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
    expect(dentists.list).not.toHaveBeenCalled();
  });

  it('returns filtered dentist data for a Super Admin', async () => {
    const dentists = createDentistService();
    await createApp(superAdminContext, dentists);

    const response = await app!.inject({
      method: 'GET',
      url: '/v1/admin/dentists?search=maria&verificationStatus=verified&page=1&pageSize=10',
    });

    expect(response.statusCode).toBe(200);
    expect(dentists.list).toHaveBeenCalledWith({
      search: 'maria',
      verificationStatus: 'verified',
      page: 1,
      pageSize: 10,
    });
    expect(response.json().data.items[0]).toMatchObject({
      firstName: 'Maria',
      lastName: 'Reyes',
      affiliatedClinicCount: 2,
    });
  });

  it('rejects invalid list filters without querying dentists', async () => {
    const dentists = createDentistService();
    await createApp(superAdminContext, dentists);

    const response = await app!.inject({
      method: 'GET',
      url: '/v1/admin/dentists?verificationStatus=rejected&page=0',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(dentists.list).not.toHaveBeenCalled();
  });
});

describe('POST /v1/admin/dentists', () => {
  const body = {
    firstName: '  Paolo ',
    lastName: ' Santos  ',
    slug: 'DR-PAOLO-SANTOS',
    licenseNumber: '',
    specialty: ' Prosthodontics ',
  };

  it('rejects unauthenticated creation before writing data', async () => {
    const creation = createDentistCreationService();
    await createApp(null, createDentistService(), creation);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/admin/dentists',
      payload: body,
    });

    expect(response.statusCode).toBe(401);
    expect(creation.create).not.toHaveBeenCalled();
  });

  it('rejects clinic members before writing data', async () => {
    const creation = createDentistCreationService();
    await createApp(clinicMemberContext, createDentistService(), creation);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/admin/dentists',
      payload: body,
    });

    expect(response.statusCode).toBe(403);
    expect(creation.create).not.toHaveBeenCalled();
  });

  it('normalizes and creates an unverified draft for a Super Admin', async () => {
    const creation = createDentistCreationService();
    await createApp(superAdminContext, createDentistService(), creation);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/admin/dentists',
      headers: { 'user-agent': 'Dentra API test' },
      payload: body,
    });

    expect(response.statusCode).toBe(201);
    expect(creation.create).toHaveBeenCalledWith(
      {
        firstName: 'Paolo',
        lastName: 'Santos',
        slug: 'dr-paolo-santos',
        licenseNumber: null,
        specialty: 'Prosthodontics',
      },
      expect.objectContaining({
        id: superAdminContext.user.id,
        email: superAdminContext.user.email,
        userAgent: 'Dentra API test',
      }),
    );
    expect(response.json().data).toMatchObject({
      verificationStatus: 'unverified',
      publicationStatus: 'draft',
    });
  });

  it('rejects malformed or client-injected fields', async () => {
    const creation = createDentistCreationService();
    await createApp(superAdminContext, createDentistService(), creation);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/admin/dentists',
      payload: { ...body, clinicId: clinicMemberContext.clinicMemberships[0].clinicId },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(creation.create).not.toHaveBeenCalled();
  });

  it('returns a conflict when the public slug is already used', async () => {
    const creation = createDentistCreationService();
    vi.mocked(creation.create).mockRejectedValueOnce(
      new AdminDentistCreationError(
        'SLUG_TAKEN',
        'That dentist slug is already in use',
      ),
    );
    await createApp(superAdminContext, createDentistService(), creation);

    const response = await app!.inject({
      method: 'POST',
      url: '/v1/admin/dentists',
      payload: body,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('SLUG_TAKEN');
  });
});
