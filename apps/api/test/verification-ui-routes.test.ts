import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';
import type { VerificationService } from '../src/verification/service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_CLINIC_ID = '55555555-5555-4555-8555-555555555555';
const SUBMISSION_ID = '77777777-7777-4777-8777-777777777777';
const user = { id: '22222222-2222-4222-8222-222222222222', email: 'admin@example.test', name: 'Admin', platformRole: 'super_admin' as const };
const superAdmin: AuthorizationContext = { user, strategies: ['superAdmin'], clinicMemberships: [] };
const clinicAdmin: AuthorizationContext = { user: { ...user, platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role: 'clinic_admin', dentistId: null }] };

function verificationMock() { return { submit: vi.fn(), listForSubject: vi.fn(async () => []), list: vi.fn(async () => []), get: vi.fn(async () => ({ id: SUBMISSION_ID, documents: [] })), download: vi.fn(), review: vi.fn() } as unknown as VerificationService; }
function auth(context: AuthorizationContext): AuthServices { return { handler: vi.fn(), getSession: vi.fn(async () => ({ session: { id: 'session', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user })), resolveAuthorization: vi.fn(async () => context) }; }
let app: FastifyInstance | undefined; afterEach(async () => { await app?.close(); app = undefined; });
async function setup(context: AuthorizationContext) { const verification = verificationMock(); app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context), verification }); return verification; }

describe('verification UI routes', () => {
  it('returns only the current clinic subject history', async () => { const verification = await setup(clinicAdmin); const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/verification?subjectType=clinic`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(200); expect(verification.listForSubject).toHaveBeenCalledWith({ clinicId: CLINIC_ID }); });
  it('supports the expiring Super Admin queue filter', async () => { const verification = await setup(superAdmin); const response = await app!.inject({ method: 'GET', url: '/v1/admin/verifications?status=expiring', headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(200); expect(verification.list).toHaveBeenCalledWith('expiring'); });
  it('requires a written review reason', async () => { const verification = await setup(superAdmin); const response = await app!.inject({ method: 'PATCH', url: `/v1/admin/verifications/${SUBMISSION_ID}`, headers: { cookie: 'session=test' }, payload: { status: 'approved', reason: '' } }); expect(response.statusCode).toBe(400); expect(verification.review).not.toHaveBeenCalled(); });
  it('denies private document detail to clinic users', async () => { const verification = await setup(clinicAdmin); const response = await app!.inject({ method: 'GET', url: `/v1/admin/verifications/${SUBMISSION_ID}`, headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(403); expect(verification.get).not.toHaveBeenCalled(); });
  it('denies verification history and upload entry to another tenant', async () => { const verification = await setup(clinicAdmin); const history = await app!.inject({ method: 'GET', url: `/v1/clinic/${OTHER_CLINIC_ID}/verification?subjectType=clinic`, headers: { cookie: 'session=test' } }); const upload = await app!.inject({ method: 'POST', url: `/v1/clinic/${OTHER_CLINIC_ID}/verification`, headers: { cookie: 'session=test' } }); expect(history.statusCode).toBe(403); expect(upload.statusCode).toBe(403); expect(verification.listForSubject).not.toHaveBeenCalled(); expect(verification.submit).not.toHaveBeenCalled(); });
});
