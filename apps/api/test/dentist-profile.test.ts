import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';
import type { DentistProfileService } from '../src/profile/dentist-profile-service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5000'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const USER_ID = '22222222-2222-4222-8222-222222222222', CLINIC_ID = '33333333-3333-4333-8333-333333333333', DENTIST_ID = '77777777-7777-4777-8777-777777777777';
const profile = { id: DENTIST_ID, firstName: 'Ana', lastName: 'Santos', slug: 'dr-ana-santos', licenseNumber: '12345', specialty: 'Orthodontics', bio: 'Bio', photoUrl: null, phone: null, email: null, verificationStatus: 'verified' as const, publicationStatus: 'published', affiliations: [] };
function context(dentistId: string | null = DENTIST_ID): AuthorizationContext { return { user: { id: USER_ID, email: 'ana@example.test', name: 'Ana Santos', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId: CLINIC_ID, branchId: null, role: 'dentist', dentistId }] }; }
function auth(value: AuthorizationContext | null): AuthServices { return { handler: vi.fn(async () => new Response('{}')), getSession: vi.fn(async () => value ? ({ session: { id: 's', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user }) : null), resolveAuthorization: vi.fn(async () => value) }; }
function service(): DentistProfileService { return { get: vi.fn(async () => profile), update: vi.fn(async () => profile), getSchedule: vi.fn(async () => []), setSchedule: vi.fn(async () => []), listTimeOff: vi.fn(async () => []), addTimeOff: vi.fn(async () => ({ id: 'time-off-1', startDate: '2030-01-01', endDate: '2030-01-02', reason: null })), removeTimeOff: vi.fn(async () => ({ id: 'time-off-1' })) }; }
let app: FastifyInstance | undefined; afterEach(async () => { await app?.close(); app = undefined; });
async function setup(value: AuthorizationContext | null) { const profiles = service(); app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(value), dentistProfiles: profiles }); return profiles; }

describe('dentist-owned profile routes', () => {
  it('derives dentist identity from membership and normalizes PRC updates', async () => { const profiles = await setup(context()); const read = await app!.inject({ method: 'GET', url: '/v1/dentist/profile', headers: { cookie: 'session=test' } }); expect(read.statusCode).toBe(200); const updated = await app!.inject({ method: 'PATCH', url: '/v1/dentist/profile', headers: { cookie: 'session=test' }, payload: { bio: 'Updated', specialty: 'General Dentistry', phone: null, email: 'ana@example.test', photoUrl: 'https://example.test/ana.jpg', licenseNumber: ' prc-12 345 ' } }); expect(updated.statusCode).toBe(200); expect(profiles.update).toHaveBeenCalledWith(DENTIST_ID, expect.objectContaining({ bio: 'Updated', licenseNumber: 'PRC12345' }), expect.objectContaining({ id: USER_ID, clinicId: CLINIC_ID })); });
  it('denies users without a linked dentist profile', async () => { const profiles = await setup(context(null)); const response = await app!.inject({ method: 'GET', url: '/v1/dentist/profile', headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(403); expect(profiles.get).not.toHaveBeenCalled(); });
  it('rejects unsafe photo URLs and read-only state fields', async () => { const profiles = await setup(context()); const response = await app!.inject({ method: 'PATCH', url: '/v1/dentist/profile', headers: { cookie: 'session=test' }, payload: { bio: null, specialty: null, phone: null, email: null, photoUrl: 'http://example.test/a.jpg', licenseNumber: null, verificationStatus: 'verified' } }); expect(response.statusCode).toBe(400); expect(profiles.update).not.toHaveBeenCalled(); });
});

const BRANCH_ID = '44444444-4444-4444-8444-444444444444';

describe('dentist-owned schedule & time off routes', () => {
  it('reads and replaces the weekly working-hours schedule for an assigned branch', async () => {
    const profiles = await setup(context());
    const read = await app!.inject({ method: 'GET', url: `/v1/dentist/schedule?branchId=${BRANCH_ID}`, headers: { cookie: 'session=test' } });
    expect(read.statusCode).toBe(200);
    const write = await app!.inject({ method: 'PUT', url: `/v1/dentist/schedule?branchId=${BRANCH_ID}`, headers: { cookie: 'session=test' }, payload: { rows: [{ weekday: 1, startsAt: 540, endsAt: 1020 }] } });
    expect(write.statusCode).toBe(200);
    expect(profiles.setSchedule).toHaveBeenCalledWith(DENTIST_ID, BRANCH_ID, [{ weekday: 1, startsAt: 540, endsAt: 1020 }], expect.objectContaining({ id: USER_ID }));
  });
  it('rejects a schedule row with an invalid weekday', async () => {
    const profiles = await setup(context());
    const response = await app!.inject({ method: 'PUT', url: `/v1/dentist/schedule?branchId=${BRANCH_ID}`, headers: { cookie: 'session=test' }, payload: { rows: [{ weekday: 7, startsAt: 540, endsAt: 1020 }] } });
    expect(response.statusCode).toBe(400);
    expect(profiles.setSchedule).not.toHaveBeenCalled();
  });
  it('lists, adds, and removes time off', async () => {
    const profiles = await setup(context());
    expect((await app!.inject({ method: 'GET', url: '/v1/dentist/time-off', headers: { cookie: 'session=test' } })).statusCode).toBe(200);
    const created = await app!.inject({ method: 'POST', url: '/v1/dentist/time-off', headers: { cookie: 'session=test' }, payload: { startDate: '2030-01-01', endDate: '2030-01-02', reason: 'Vacation' } });
    expect(created.statusCode).toBe(201);
    expect(profiles.addTimeOff).toHaveBeenCalledWith(DENTIST_ID, { startDate: '2030-01-01', endDate: '2030-01-02', reason: 'Vacation' }, expect.objectContaining({ id: USER_ID }));
    const timeOffId = '55555555-5555-4555-8555-555555555555';
    const deleted = await app!.inject({ method: 'DELETE', url: `/v1/dentist/time-off/${timeOffId}`, headers: { cookie: 'session=test' } });
    expect(deleted.statusCode).toBe(200);
    expect(profiles.removeTimeOff).toHaveBeenCalledWith(DENTIST_ID, timeOffId, expect.objectContaining({ id: USER_ID }));
  });
  it('denies schedule access without a linked dentist profile', async () => {
    const profiles = await setup(context(null));
    const response = await app!.inject({ method: 'GET', url: `/v1/dentist/schedule?branchId=${BRANCH_ID}`, headers: { cookie: 'session=test' } });
    expect(response.statusCode).toBe(403);
    expect(profiles.getSchedule).not.toHaveBeenCalled();
  });
});
