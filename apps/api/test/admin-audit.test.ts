import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AdminAuditService } from '../src/admin/audit-service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = {
  nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: [],
  authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001',
};
const admin: AuthorizationContext = {
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'admin@dentra.ph', name: 'Admin', platformRole: 'super_admin' },
  strategies: ['superAdmin'], clinicMemberships: [],
};
const clinicOwner: AuthorizationContext = {
  user: { id: '22222222-2222-4222-8222-222222222222', email: 'owner@example.com', name: 'Owner', platformRole: null },
  strategies: ['clinicMember'],
  clinicMemberships: [{ clinicId: '33333333-3333-4333-8333-333333333333', branchId: null, role: 'clinic_owner', dentistId: null }],
};
const auth = (context: AuthorizationContext | null): AuthServices => ({
  handler: vi.fn(async () => new Response()),
  getSession: vi.fn(async () => context ? { session: { id: 's', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user } : null),
  resolveAuthorization: vi.fn(async () => context),
});
const audit = (): AdminAuditService => ({
  list: vi.fn(async () => ({
    items: [{ id: 'event', actorId: admin.user.id, actorEmail: admin.user.email, clinicId: null, clinicName: null, entityType: 'clinic', entityId: '44444444-4444-4444-8444-444444444444', action: 'CLINIC_CREATED', metadata: null, ipAddress: '127.0.0.1', occurredAt: new Date('2026-08-12T01:00:00Z') }],
    actionOptions: ['CLINIC_CREATED'],
    pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  })),
});

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(context: AuthorizationContext | null, service: AdminAuditService) {
  app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth: auth(context), adminAudit: service });
}

describe('GET /v1/admin/audit', () => {
  it('requires authentication', async () => {
    const service = audit(); await setup(null, service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/audit' });
    expect(response.statusCode).toBe(401);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('requires the exact Super Admin role', async () => {
    const service = audit(); await setup(clinicOwner, service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/audit' });
    expect(response.statusCode).toBe(403);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('passes validated actor, action, Manila date range, and pagination filters', async () => {
    const service = audit(); await setup(admin, service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/audit?actor=admin%40dentra.ph&action=CLINIC_CREATED&dateFrom=2026-08-01&dateTo=2026-08-12&page=2&pageSize=25' });
    expect(response.statusCode).toBe(200);
    expect(service.list).toHaveBeenCalledWith({
      actor: 'admin@dentra.ph', action: 'CLINIC_CREATED',
      dateFrom: new Date('2026-07-31T16:00:00.000Z'),
      dateToExclusive: new Date('2026-08-12T16:00:00.000Z'),
      page: 2, pageSize: 25,
    });
    expect(response.json().data.items[0].action).toBe('CLINIC_CREATED');
  });

  it('rejects reversed dates and oversized filters', async () => {
    const service = audit(); await setup(admin, service);
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/audit?dateFrom=2026-08-13&dateTo=2026-08-12&actor=${'a'.repeat(101)}` });
    expect(response.statusCode).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });
});
