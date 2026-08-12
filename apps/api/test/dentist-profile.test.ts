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
function service(): DentistProfileService { return { get: vi.fn(async () => profile), update: vi.fn(async () => profile) }; }
let app: FastifyInstance | undefined; afterEach(async () => { await app?.close(); app = undefined; });
async function setup(value: AuthorizationContext | null) { const profiles = service(); app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: auth(value), dentistProfiles: profiles }); return profiles; }

describe('dentist-owned profile routes', () => {
  it('derives dentist identity from membership for reads and updates', async () => { const profiles = await setup(context()); const read = await app!.inject({ method: 'GET', url: '/v1/dentist/profile', headers: { cookie: 'session=test' } }); expect(read.statusCode).toBe(200); const updated = await app!.inject({ method: 'PATCH', url: '/v1/dentist/profile', headers: { cookie: 'session=test' }, payload: { bio: 'Updated', specialty: 'General Dentistry', phone: null, email: 'ana@example.test', photoUrl: 'https://example.test/ana.jpg', licenseNumber: '12345' } }); expect(updated.statusCode).toBe(200); expect(profiles.update).toHaveBeenCalledWith(DENTIST_ID, expect.objectContaining({ bio: 'Updated' }), expect.objectContaining({ id: USER_ID, clinicId: CLINIC_ID })); });
  it('denies users without a linked dentist profile', async () => { const profiles = await setup(context(null)); const response = await app!.inject({ method: 'GET', url: '/v1/dentist/profile', headers: { cookie: 'session=test' } }); expect(response.statusCode).toBe(403); expect(profiles.get).not.toHaveBeenCalled(); });
  it('rejects unsafe photo URLs and read-only state fields', async () => { const profiles = await setup(context()); const response = await app!.inject({ method: 'PATCH', url: '/v1/dentist/profile', headers: { cookie: 'session=test' }, payload: { bio: null, specialty: null, phone: null, email: null, photoUrl: 'http://example.test/a.jpg', licenseNumber: null, verificationStatus: 'verified' } }); expect(response.statusCode).toBe(400); expect(profiles.update).not.toHaveBeenCalled(); });
});
