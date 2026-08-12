import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { DB } from '@dentra/db';
import { buildApp } from '../src/app.js';
import { createAdminDashboardService, type AdminDashboardService } from '../src/admin/dashboard-service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5000'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const admin: AuthorizationContext = { user: { id: '22222222-2222-4222-8222-222222222222', email: 'admin@dentra.ph', name: 'Admin', platformRole: 'super_admin' }, strategies: ['superAdmin'], clinicMemberships: [] };
const clinicUser: AuthorizationContext = { user: { ...admin.user, platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: '33333333-3333-4333-8333-333333333333', branchId: null, role: 'clinic_owner', dentistId: null }] };
function auth(value: AuthorizationContext | null): AuthServices { return { handler: vi.fn(async () => new Response('{}')), getSession: vi.fn(async () => value ? ({ session: { id: 's', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user }) : null), resolveAuthorization: vi.fn(async () => value) }; }
const result = { metrics: { totalClinics: 4, currentSubscriptions: 3, totalDentists: 9, totalAppointments: 27, appointmentsLast30Days: 6 }, clinicStatuses: { active: 2, trial: 1, suspended: 1, archived: 0 }, subscriptionStatuses: { active: 2, trial: 1, past_due: 1 }, recentActivity: [] };
let app: FastifyInstance | undefined; afterEach(async () => { await app?.close(); app = undefined; });

describe('admin dashboard', () => {
  it('normalizes live aggregate values and omits audit metadata', async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce([{ totalClinics: '4', activeClinics: '2', trialClinics: '1', suspendedClinics: '1', archivedClinics: '0', activeSubscriptions: '2', trialSubscriptions: '1', pastDueSubscriptions: '1', totalDentists: '9', totalAppointments: '27', appointmentsLast30Days: '6' }])
      .mockResolvedValueOnce([{ id: 'event', action: 'clinic.activated', entityType: 'clinic', clinicName: 'Demo Clinic', occurredAt: new Date('2026-08-13T00:00:00Z') }]);
    const service = createAdminDashboardService({ execute } as unknown as Pick<DB, 'execute'>);
    const data = await service.get();
    expect(data.metrics).toEqual(result.metrics);
    expect(data.clinicStatuses).toEqual(result.clinicStatuses);
    expect(data.recentActivity[0]).toEqual(expect.objectContaining({ action: 'clinic.activated', clinicName: 'Demo Clinic' }));
    expect(data.recentActivity[0]).not.toHaveProperty('metadata');
  });

  it('allows only Super Admin to read platform aggregates', async () => {
    const dashboard: AdminDashboardService = { get: vi.fn(async () => result) };
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(admin), adminDashboard: dashboard });
    expect((await app.inject({ method: 'GET', url: '/v1/admin/dashboard', headers: { cookie: 'session=test' } })).statusCode).toBe(200);
    await app.close();
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(clinicUser), adminDashboard: dashboard });
    expect((await app.inject({ method: 'GET', url: '/v1/admin/dashboard', headers: { cookie: 'session=test' } })).statusCode).toBe(403);
    expect(dashboard.get).toHaveBeenCalledTimes(1);
  });
});
