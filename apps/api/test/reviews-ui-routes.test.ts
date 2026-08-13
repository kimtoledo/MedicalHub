import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';
import type { ReviewService } from '../src/reviews/service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_CLINIC_ID = '55555555-5555-4555-8555-555555555555';
const REVIEW_ID = '77777777-7777-4777-8777-777777777777';
const DENTIST_ID = '88888888-8888-4888-8888-888888888888';
const user = { id: '22222222-2222-4222-8222-222222222222', email: 'admin@example.test', name: 'Admin', platformRole: 'super_admin' as const };
const superAdmin: AuthorizationContext = { user, strategies: ['superAdmin'], clinicMemberships: [] };
const clinicAdmin: AuthorizationContext = { user: { ...user, platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role: 'clinic_admin', dentistId: null }] };

function reviewsMock() {
  return {
    eligible: vi.fn(async () => []), mine: vi.fn(async () => []), submit: vi.fn(),
    listPublic: vi.fn(async () => ({ reviews: [{ id: REVIEW_ID, author: 'Verified patient' }], averageRating: 5, total: 1, page: 1, pageSize: 10, totalPages: 1 })),
    listClinic: vi.fn(async () => []), listModeration: vi.fn(async () => []), report: vi.fn(), moderate: vi.fn(), respond: vi.fn(),
  } as unknown as ReviewService;
}

function auth(context: AuthorizationContext | null): AuthServices {
  return { handler: vi.fn(), getSession: vi.fn(async () => context ? ({ session: { id: 'session', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user }) : null), resolveAuthorization: vi.fn(async () => context) };
}

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(context: AuthorizationContext | null = null) { const reviews = reviewsMock(); app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(context), reviews }); return reviews; }

describe('review experience routes', () => {
  it('scopes patient eligibility to the opaque patient session cookie', async () => {
    const reviews = await setup();
    const response = await app!.inject({ method: 'GET', url: '/v1/patient/reviews/eligible', headers: { cookie: 'dentra_patient_session=patient-token' } });
    expect(response.statusCode).toBe(200);
    expect(reviews.eligible).toHaveBeenCalledWith('patient-token');
  });

  it('returns a PII-safe paginated public dentist review response', async () => {
    const reviews = await setup();
    const response = await app!.inject({ method: 'GET', url: `/v1/public/dentists/${DENTIST_ID}/reviews?page=2&pageSize=5` });
    expect(response.statusCode).toBe(200);
    expect(reviews.listPublic).toHaveBeenCalledWith(undefined, DENTIST_ID, 2, 5);
    expect(response.json().data.reviews[0]).toEqual({ id: REVIEW_ID, author: 'Verified patient' });
  });

  it('denies a clinic review queue from another tenant', async () => {
    const reviews = await setup(clinicAdmin);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/${OTHER_CLINIC_ID}/reviews`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(reviews.listClinic).not.toHaveBeenCalled();
  });

  it('loads the reported queue for Super Admin', async () => {
    const reviews = await setup(superAdmin);
    const response = await app!.inject({ method: 'GET', url: '/v1/admin/reviews?status=reported', headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(200);
    expect(reviews.listModeration).toHaveBeenCalledWith('reported');
  });

  it('requires a written moderation reason', async () => {
    const reviews = await setup(superAdmin);
    const response = await app!.inject({ method: 'PATCH', url: `/v1/admin/reviews/${REVIEW_ID}`, headers: { cookie: 'session=test' }, payload: { status: 'approved', reason: '' } });
    expect(response.statusCode).toBe(400);
    expect(reviews.moderate).not.toHaveBeenCalled();
  });

  it('forwards authenticated patient abuse reports without exposing tenant authority', async () => {
    const reviews = await setup();
    const response = await app!.inject({ method: 'POST', url: `/v1/patient/reviews/${REVIEW_ID}/report`, headers: { cookie: 'dentra_patient_session=patient-token' }, payload: { reason: 'privacy', details: 'Contains a phone number' } });
    expect(response.statusCode).toBe(201);
    expect(reviews.report).toHaveBeenCalledWith('patient-token', REVIEW_ID, { reason: 'privacy', details: 'Contains a phone number' });
  });
});
