import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AdminClinicListService } from '../src/admin/clinics-service.js';
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
    email: 'admin@toothhub.ph',
    name: 'ToothHub Admin',
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

async function createApp(
  context: AuthorizationContext | null,
  clinics: AdminClinicListService,
) {
  app = await buildApp({
    config,
    checkDatabase: async () => undefined,
    logger: false,
    auth: createAuth(context),
    adminClinics: clinics,
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
