import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';
import type { HmoService } from '../src/clinic/hmo-service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5000'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333', OTHER_CLINIC_ID = '55555555-5555-4555-8555-555555555555', PATIENT_ID = '66666666-6666-4666-8666-666666666666';
const context: AuthorizationContext = { user: { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.test', name: 'Staff', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role: 'clinic_admin', dentistId: null }] };
function auth(): AuthServices { return { handler: vi.fn(async () => new Response('{}')), getSession: vi.fn(async () => ({ session: { id: 's', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user })), resolveAuthorization: vi.fn(async () => context) }; }
function hmo(): HmoService { return { listPayers: vi.fn(async () => []), createPayer: vi.fn(), updatePayer: vi.fn(), getPayer: vi.fn(async () => null), listMemberships: vi.fn(async () => []), upsertMembership: vi.fn(), deleteMembership: vi.fn(), claimOptions: vi.fn(async (_clinicId, input) => input.patientId ? { patient: { id: PATIENT_ID, patientNumber: 'SBD-0001', name: 'Patient, Demo' }, memberships: [], invoices: [], encounters: [] } : { patients: [{ id: PATIENT_ID, patientNumber: 'SBD-0001', name: 'Patient, Demo' }] }), listClaims: vi.fn(async () => ({ data: [], total: 0 })), getClaim: vi.fn(async () => null), createClaim: vi.fn(), updateClaimStatus: vi.fn(), getClaimPdfData: vi.fn(async () => null) } as HmoService; }
let app: FastifyInstance | undefined; afterEach(async () => { await app?.close(); app = undefined; });
async function setup() { const service = hmo(); app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(), hmo: service }); return service; }

describe('HMO claim option routes', () => {
  it('searches and loads patient choices within the authenticated clinic', async () => { const service = await setup(); const search = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/hmo/claim-options?search=Demo`, headers: { cookie: 'session=test' } }); expect(search.statusCode).toBe(200); expect(service.claimOptions).toHaveBeenCalledWith(CLINIC_ID, { search: 'Demo' }); const selected = await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/hmo/claim-options?patientId=${PATIENT_ID}`, headers: { cookie: 'session=test' } }); expect(selected.statusCode).toBe(200); expect(service.claimOptions).toHaveBeenCalledWith(CLINIC_ID, { patientId: PATIENT_ID }); });
  it('rejects empty searches and cross-tenant option requests', async () => { const service = await setup(); expect((await app!.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/hmo/claim-options`, headers: { cookie: 'session=test' } })).statusCode).toBe(400); expect((await app!.inject({ method: 'GET', url: `/v1/clinic/${OTHER_CLINIC_ID}/hmo/claim-options?search=Demo`, headers: { cookie: 'session=test' } })).statusCode).toBe(403); expect(service.claimOptions).not.toHaveBeenCalled(); });
  it('rejects a zero-value claim before calling the service', async () => { const service = await setup(); const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/hmo/claims`, headers: { cookie: 'session=test' }, payload: { patientId: PATIENT_ID, payerNameSnapshot: 'Demo HMO', claimAmountPhp: '0' } }); expect(response.statusCode).toBe(400); expect(service.createClaim).not.toHaveBeenCalled(); });
});
