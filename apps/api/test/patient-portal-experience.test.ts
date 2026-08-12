import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { AuthServices } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';
import type { PatientPortalService } from '../src/patient/portal-service.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: ['http://localhost:5001'], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const PATIENT_ID = '66666666-6666-4666-8666-666666666666';

function portalMock() {
  return {
    signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getSession: vi.fn(), link: vi.fn(), portal: vi.fn(), request: vi.fn(),
    linkByReference: vi.fn(async () => ({ id: 'linked' })),
    revokeLink: vi.fn(async () => ({ id: 'revoked' })),
  } as unknown as PatientPortalService;
}

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });

async function setup() {
  const portal = portalMock();
  const auth = { handler: vi.fn(), getSession: vi.fn(), resolveAuthorization: vi.fn() } as unknown as AuthServices;
  app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth, patientPortal: portal });
  return portal;
}

describe('patient portal experience routes', () => {
  it('links a clinic record by patient-facing references with explicit consent', async () => {
    const portal = await setup();
    const response = await app!.inject({ method: 'POST', url: '/v1/patient/links/by-reference', headers: { cookie: 'dentra_patient_session=patient-token' }, payload: { clinicSlug: 'smile-bright', patientNumber: 'SBD-0001', consent: true } });
    expect(response.statusCode).toBe(201);
    expect(portal.linkByReference).toHaveBeenCalledWith('patient-token', { clinicSlug: 'smile-bright', patientNumber: 'SBD-0001', consent: true });
  });

  it('rejects record linking without explicit consent', async () => {
    const portal = await setup();
    const response = await app!.inject({ method: 'POST', url: '/v1/patient/links/by-reference', payload: { clinicSlug: 'smile-bright', patientNumber: 'SBD-0001', consent: false } });
    expect(response.statusCode).toBe(400);
    expect(portal.linkByReference).not.toHaveBeenCalled();
  });

  it('revokes only the selected clinic and patient link', async () => {
    const portal = await setup();
    const response = await app!.inject({ method: 'DELETE', url: `/v1/patient/links/${CLINIC_ID}/${PATIENT_ID}`, headers: { cookie: 'dentra_patient_session=patient-token' } });
    expect(response.statusCode).toBe(200);
    expect(portal.revokeLink).toHaveBeenCalledWith('patient-token', CLINIC_ID, PATIENT_ID);
  });
});
