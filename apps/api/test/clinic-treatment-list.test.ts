import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import type { ClinicTreatmentsService } from '../src/clinic/treatments-service.js';
import type { EntitlementService } from '../src/entitlements/service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';

const clinicId = '00000000-0000-0000-0000-000000000101';
const branchId = '00000000-0000-0000-0000-000000000111';
const dentistId = '00000000-0000-0000-0000-000000000401';
const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: [], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const context: AuthorizationContext = { user: { id: 'dentist-user', email: 'dentist@test', name: 'Dentist', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId, branchId, role: 'dentist', dentistId }] };
const auth: AuthServices = { handler: vi.fn(async () => new Response()), getSession: vi.fn(async () => ({ session: { id: 's', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user })), resolveAuthorization: vi.fn(async () => context) };
const entitlements: EntitlementService = { resolve: vi.fn(async (id) => ({ clinic: { id, name: 'Clinic', status: 'active', maintenanceMode: false }, subscription: null, entitlements: [{ featureKey: FeatureKey.TREATMENT_RECORDS, isEnabled: true, source: 'package' as const, expiresAt: null }] })) };
function service(): ClinicTreatmentsService { return { serviceOptions: vi.fn(async () => []), list: vi.fn(async () => ({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } })), listForPatient: vi.fn(async () => []), create: vi.fn(async () => ({ id: 'record' })) }; }

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });

describe('clinic service-record list', () => {
  it('applies membership branch scope and the signed-in dentist identity', async () => {
    const treatments = service();
    app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth, entitlements, clinicTreatments: treatments });
    const response = await app.inject({ method: 'GET', url: `/v1/clinic/treatments?clinicId=${clinicId}&search=cleaning&workflowMode=quick` });
    expect(response.statusCode).toBe(200);
    expect(treatments.list).toHaveBeenCalledWith(clinicId, expect.objectContaining({ search: 'cleaning', workflowMode: 'quick', branchIds: [branchId], dentistId }));
  });

  it('rejects a branch outside the membership before querying records', async () => {
    const treatments = service();
    app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth, entitlements, clinicTreatments: treatments });
    const response = await app.inject({ method: 'GET', url: `/v1/clinic/treatments?clinicId=${clinicId}&branchId=00000000-0000-0000-0000-000000000999` });
    expect(response.statusCode).toBe(403);
    expect(treatments.list).not.toHaveBeenCalled();
  });
});
