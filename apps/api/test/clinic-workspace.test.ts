import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { ClinicWorkspaceService } from '../src/clinic/workspace-service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';
const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: [], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const clinicId = '00000000-0000-0000-0000-000000000101'; const branchId = '00000000-0000-0000-0000-000000000111'; const otherClinicId = '00000000-0000-0000-0000-000000000201';
const member: AuthorizationContext = { user: { id: 'user', email: 'staff@test', name: 'Staff User', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId, branchId, role: 'receptionist', dentistId: null }] };
const auth = (context: AuthorizationContext | null): AuthServices => ({ handler: vi.fn(async () => new Response()), getSession: vi.fn(async () => context ? { session: { id: 'session', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user } : null), resolveAuthorization: vi.fn(async () => context) });
const workspace = (): ClinicWorkspaceService => ({ get: vi.fn(async (id) => ({ clinic: { id, name: 'Smile Bright' }, branches: [{ id: branchId, name: 'Main', isMain: true, city: 'Quezon City', province: 'Metro Manila' }] })) });
let app: FastifyInstance | undefined; afterEach(async () => { await app?.close(); app = undefined; });
async function setup(context: AuthorizationContext | null, service: ClinicWorkspaceService) { app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth: auth(context), clinicWorkspace: service }); }
describe('clinic workspace context', () => {
  it('limits branch context to branch-scoped memberships', async () => { const service = workspace(); await setup(member, service); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${clinicId}/context` }); expect(response.statusCode).toBe(200); expect(service.get).toHaveBeenCalledWith(clinicId, [branchId]); });
  it('returns all branches for a clinic-wide membership', async () => { const service = workspace(); await setup({ ...member, clinicMemberships: [{ ...member.clinicMemberships[0], branchId: null, role: 'clinic_admin' }] }, service); await app!.inject({ method: 'GET', url: `/v1/clinic/${clinicId}/context` }); expect(service.get).toHaveBeenCalledWith(clinicId, null); });
  it('denies cross-tenant context before querying', async () => { const service = workspace(); await setup(member, service); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${otherClinicId}/context` }); expect(response.statusCode).toBe(403); expect(service.get).not.toHaveBeenCalled(); });
  it('requires a valid session', async () => { const service = workspace(); await setup(null, service); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${clinicId}/context` }); expect(response.statusCode).toBe(401); });
});
