import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { PublicDirectoryService } from '../src/public/directory-service.js';
import type { ApiConfig } from '../src/config.js';
const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: [], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
let app: FastifyInstance | undefined; afterEach(async () => { await app?.close(); app = undefined; });
function directory(): PublicDirectoryService { return {
  listClinics: vi.fn(async () => ({ items: [{ id: 'clinic', name: 'Smile Bright', slug: 'smile-bright', description: 'Public profile', logoUrl: null, city: 'Makati', province: 'Metro Manila', locations: ['Makati, Metro Manila'], services: ['Cleaning'] }], pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 } })),
  listDentists: vi.fn(async () => ({ items: [{ id: 'dentist', firstName: 'Maria', lastName: 'Reyes', slug: 'dr-maria-reyes', specialty: 'Orthodontics', bio: 'Public profile', photoUrl: null, affiliatedClinicCount: 1 }], pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 } })),
  summary: vi.fn(async () => ({ publishedClinicCount: 1, publishedDentistCount: 1 })),
}; }
async function setup(service: PublicDirectoryService) { app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, publicDirectory: service }); }
describe('public directory routes', () => {
  it('serves clinic filters without authentication', async () => { const service = directory(); await setup(service); const response = await app!.inject({ method: 'GET', url: '/v1/public/clinics?search=smile&location=makati&service=cleaning&page=1' }); expect(response.statusCode).toBe(200); expect(service.listClinics).toHaveBeenCalledWith({ search: 'smile', location: 'makati', service: 'cleaning', page: 1, pageSize: 12 }); expect(response.json().data.items[0]).not.toHaveProperty('email'); });
  it('serves verified dentist search and public summary', async () => { const service = directory(); await setup(service); const dentists = await app!.inject({ method: 'GET', url: '/v1/public/dentists?specialty=ortho' }); const summary = await app!.inject({ method: 'GET', url: '/v1/public/summary' }); expect(dentists.statusCode).toBe(200); expect(summary.json().data).toEqual({ publishedClinicCount: 1, publishedDentistCount: 1 }); });
  it('rejects oversized and malformed directory filters', async () => { const service = directory(); await setup(service); const response = await app!.inject({ method: 'GET', url: `/v1/public/clinics?search=${'x'.repeat(101)}&page=0` }); expect(response.statusCode).toBe(400); expect(service.listClinics).not.toHaveBeenCalled(); });
});
