import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';
import type { AccountProfile, AccountProfileService } from '../src/profile/service.js';

const config: ApiConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 3001,
  logLevel: 'silent',
  corsOrigins: ['http://localhost:5001'],
  authSecret: 'test-secret-that-is-at-least-32-characters',
  authBaseUrl: 'http://localhost:3001',
};

const userId = '11111111-1111-4111-8111-111111111111';
const clinicId = '22222222-2222-4222-8222-222222222222';

const clinicContext: AuthorizationContext = {
  user: {
    id: userId,
    email: 'staff@example.test',
    name: 'Jamie Santos',
    platformRole: null,
  },
  strategies: ['clinicMember'],
  clinicMemberships: [{ clinicId, branchId: null, role: 'receptionist', dentistId: null }],
};

const profile: AccountProfile = {
  user: {
    id: userId,
    firstName: 'Jamie',
    lastName: 'Santos',
    name: 'Jamie Santos',
    email: 'staff@example.test',
    phone: '+63 917 123 4567',
    avatarUrl: null,
    emailVerified: true,
  },
  memberships: [{
    clinicId,
    clinicName: 'Dentra Test Clinic',
    branchId: null,
    branchName: null,
    role: 'receptionist',
  }],
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function authFor(context: AuthorizationContext | null): AuthServices {
  return {
    handler: vi.fn(async () => new Response('{}')),
    getSession: vi.fn(async () => context ? ({
      session: { id: '33333333-3333-4333-8333-333333333333', userId: context.user.id, expiresAt: new Date('2030-01-01') },
      user: context.user,
    }) : null),
    resolveAuthorization: vi.fn(async () => context),
  };
}

function profileService(overrides: Partial<AccountProfileService> = {}): AccountProfileService {
  return {
    get: vi.fn(async () => profile),
    update: vi.fn(async () => profile),
    ...overrides,
  };
}

async function createApp(auth: AuthServices, profiles = profileService()) {
  app = await buildApp({
    config,
    checkDatabase: async () => undefined,
    logger: false,
    auth,
    profiles,
  });
  return profiles;
}

describe('self-service account profile routes', () => {
  it('rejects unauthenticated profile reads', async () => {
    const profiles = await createApp(authFor(null));
    const response = await app!.inject({ method: 'GET', url: '/v1/profile' });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHENTICATED');
    expect(profiles.get).not.toHaveBeenCalled();
  });

  it('requires an active clinic membership', async () => {
    const platformContext: AuthorizationContext = {
      ...clinicContext,
      strategies: ['superAdmin'],
      clinicMemberships: [],
      user: { ...clinicContext.user, platformRole: 'super_admin' },
    };
    const profiles = await createApp(authFor(platformContext));
    const response = await app!.inject({ method: 'GET', url: '/v1/profile' });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
    expect(profiles.get).not.toHaveBeenCalled();
  });

  it('loads only the session user profile', async () => {
    const profiles = await createApp(authFor(clinicContext));
    const response = await app!.inject({ method: 'GET', url: '/v1/profile' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true, data: profile });
    expect(profiles.get).toHaveBeenCalledWith(userId);
  });

  it('rejects immutable and client-controlled identity fields', async () => {
    const profiles = await createApp(authFor(clinicContext));
    const response = await app!.inject({
      method: 'PATCH',
      url: '/v1/profile',
      payload: {
        firstName: 'Jamie',
        lastName: 'Santos',
        phone: null,
        avatarUrl: null,
        email: 'changed@example.test',
        userId: '44444444-4444-4444-8444-444444444444',
        role: 'clinic_owner',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('validates phone numbers and avatar URLs', async () => {
    const profiles = await createApp(authFor(clinicContext));
    const response = await app!.inject({
      method: 'PATCH',
      url: '/v1/profile',
      payload: {
        firstName: 'Jamie',
        lastName: 'Santos',
        phone: 'not-a-number',
        avatarUrl: 'javascript:alert(1)',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('updates the session user and supplies tenant-scoped audit context', async () => {
    const update = vi.fn(async () => ({
      ...profile,
      user: { ...profile.user, firstName: 'Alex', name: 'Alex Santos', phone: null },
    }));
    await createApp(authFor(clinicContext), profileService({ update }));
    const response = await app!.inject({
      method: 'PATCH',
      url: '/v1/profile',
      headers: { 'user-agent': 'profile-test' },
      payload: {
        firstName: ' Alex ',
        lastName: 'Santos',
        phone: null,
        avatarUrl: 'https://images.example.test/avatar.jpg',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.user.name).toBe('Alex Santos');
    expect(update).toHaveBeenCalledWith(
      userId,
      {
        firstName: 'Alex',
        lastName: 'Santos',
        phone: null,
        avatarUrl: 'https://images.example.test/avatar.jpg',
      },
      expect.objectContaining({ id: userId, email: clinicContext.user.email, clinicId, userAgent: 'profile-test' }),
    );
  });
});
