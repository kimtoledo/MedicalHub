import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';
import type { OrganizationService } from '../src/organizations/service.js';
import { OrganizationError } from '../src/organizations/service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const USER_ID = '22222222-2222-4222-8222-222222222222';
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_CLINIC_ID = '55555555-5555-4555-8555-555555555555';
const ORGANIZATION_ID = '77777777-7777-4777-8777-777777777777';
const BRANCH_ID = '88888888-8888-4888-8888-888888888888';
const context: AuthorizationContext = { user: { id: USER_ID, email: 'owner@example.test', name: 'Owner', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role: 'clinic_owner', dentistId: null }] };

function organizationsMock() { return { create: vi.fn(), eligibleClinics: vi.fn(async () => []), attachClinic: vi.fn(), listMine: vi.fn(async () => []), workspace: vi.fn(async () => ({ organization: {}, access: {}, clinics: [], members: [] })), report: vi.fn(async () => ({})), upsertMember: vi.fn() } as unknown as OrganizationService; }
function auth(value: AuthorizationContext | null): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => value ? ({ session: { id: 'session', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user }) : null), resolveAuthorization: vi.fn(async () => value) }; }
let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(value: AuthorizationContext | null = context) { const organizations = organizationsMock(); app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(value), organizations }); return organizations; }

describe('enterprise organization UI routes', () => {
  it('loads workspace data using only the authenticated user identity', async () => { const organizations = await setup(); const response = await app!.inject({ method: 'GET', url: `/v1/organizations/${ORGANIZATION_ID}/workspace`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(200); expect(organizations.workspace).toHaveBeenCalledWith(ORGANIZATION_ID, USER_ID); });
  it('maps organization membership denial without returning workspace data', async () => { const organizations = await setup(); vi.mocked(organizations.workspace).mockRejectedValueOnce(new OrganizationError('FORBIDDEN', 'Organization access is required', 403)); const response = await app!.inject({ method: 'GET', url: `/v1/organizations/${ORGANIZATION_ID}/workspace`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(403); });
  it('denies attaching a clinic the actor does not administer', async () => { const organizations = await setup(); const response = await app!.inject({ method: 'POST', url: `/v1/organizations/${ORGANIZATION_ID}/clinics`, headers: { cookie: 'session=test' }, payload: { clinicId: OTHER_CLINIC_ID } }); expect(response.statusCode).toBe(403); expect(organizations.attachClinic).not.toHaveBeenCalled(); });
  it('passes bounded regional branch assignments to the service', async () => { const organizations = await setup(); const response = await app!.inject({ method: 'POST', url: `/v1/organizations/${ORGANIZATION_ID}/members`, headers: { cookie: 'session=test' }, payload: { email: 'regional@example.test', role: 'regional_manager', branchIds: [BRANCH_ID] } }); expect(response.statusCode).toBe(200); expect(organizations.upsertMember).toHaveBeenCalledWith(ORGANIZATION_ID, { email: 'regional@example.test', role: 'regional_manager', branchIds: [BRANCH_ID] }, expect.objectContaining({ id: USER_ID })); });
  it('requires authentication for consolidated reports', async () => { const organizations = await setup(null); const response = await app!.inject({ method: 'GET', url: `/v1/organizations/${ORGANIZATION_ID}/report` }); expect(response.statusCode).toBe(401); expect(organizations.report).not.toHaveBeenCalled(); });
});
