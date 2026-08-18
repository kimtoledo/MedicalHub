import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminEmailLogsService } from '../src/admin/email-logs-service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import { registerAdminEmailLogRoutes } from '../src/routes/admin-email-logs.js';

const admin: AuthorizationContext = { user: { id: 'admin', email: 'admin@dentra.ph', name: 'Admin', platformRole: 'super_admin' }, strategies: ['superAdmin'], clinicMemberships: [] };
const clinicUser: AuthorizationContext = { user: { id: 'clinic', email: 'clinic@example.test', name: 'Clinic', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [] };
const auth = (context: AuthorizationContext | null): AuthServices => ({
  handler: vi.fn(async () => new Response()),
  getSession: vi.fn(async () => context ? {
    session: { id: 'session', userId: context.user.id, expiresAt: new Date('2030-01-01') },
    user: context.user,
  } : null),
  resolveAuthorization: vi.fn(async () => context),
});

function emailLogs(): AdminEmailLogsService {
  return {
    list: vi.fn(async (filters) => ({ items: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 1 } })),
    get: vi.fn(async (id) => ({ id, clinicId: null, clinicName: null, source: 'platform' as const, channel: 'email' as const, type: 'dentist_verification_approved' as const, recipient: 'maria@example.test', subject: 'Approved', body: 'Safe preview', dedupeKey: 'verification:1:approved', status: 'held' as const, attempts: 0, nextAttemptAt: new Date(), lastError: null, sentAt: null, createdAt: new Date(), updatedAt: new Date() })),
  };
}

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });

async function setup(context: AuthorizationContext | null, service: AdminEmailLogsService) {
  app = Fastify({ logger: false });
  await registerAdminEmailLogRoutes(app, { auth: auth(context), emailLogs: service });
}

describe('Super Admin email logs', () => {
  it('parses filters and lists held platform email previews', async () => {
    const service = emailLogs(); await setup(admin, service);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/email-logs?status=held&type=dentist_verification_approved&dateFrom=2026-08-01&dateTo=2026-08-31&page=2&pageSize=10' });
    expect(response.statusCode).toBe(200);
    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'held', type: 'dentist_verification_approved', page: 2, pageSize: 10, dateFrom: expect.any(Date), dateTo: expect.any(Date) }));
  });

  it('returns the exact saved content to Super Admin only', async () => {
    const service = emailLogs(); await setup(admin, service);
    const id = '11111111-1111-4111-8111-111111111111';
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/email-logs/${id}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ body: 'Safe preview', status: 'held' });
    await app!.close(); app = undefined; await setup(clinicUser, service);
    const denied = await app!.inject({ method: 'GET', url: '/v1/admin/email-logs' });
    expect(denied.statusCode).toBe(403);
  });
});
