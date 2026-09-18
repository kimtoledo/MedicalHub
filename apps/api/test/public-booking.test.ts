import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { overlaps, PublicBookingError, type PublicBookingService } from '../src/public/booking-service.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: [], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const clinicId = '00000000-0000-0000-0000-000000000101';
const branchId = '00000000-0000-0000-0000-000000000111';
const serviceId = '00000000-0000-0000-0000-000000000501';
const dentistId = '00000000-0000-0000-0000-000000000401';
let app: FastifyInstance | undefined;
beforeEach(() => { vi.stubEnv('RECAPTCHA_SECRET_KEY', ''); });
afterEach(async () => { await app?.close(); app = undefined; vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function booking(): PublicBookingService { return {
  availability: vi.fn(async () => ({ date: '2030-05-10', durationMinutes: 30, slots: [{ startsAt: '2030-05-10T01:00:00.000Z', endsAt: '2030-05-10T01:30:00.000Z' }], closedReason: null })),
  book: vi.fn(async () => ({ appointmentId: clinicId, confirmationNumber: 'DNT-20300510-00000000', clinicName: 'Smile Bright', branchName: 'Main', serviceName: 'Cleaning', dentistName: 'Dr. Maria Reyes', startsAt: '2030-05-10T01:00:00.000Z', endsAt: '2030-05-10T01:30:00.000Z', status: 'pending' as const })),
}; }
async function setup(service: PublicBookingService) { app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, publicBooking: service }); }

describe('public booking routes', () => {
  const validPayload = { clinicSlug: 'smile-bright', branchId, serviceId, date: '2030-05-10', startsAt: '2030-05-10T01:00:00.000Z', patientFirstName: 'Ana', patientLastName: 'Santos', patientPhone: '09170000000', patientEmail: 'ana@example.com', chiefComplaint: 'Routine cleaning', agreedToTerms: true };
  it.each(['', undefined])('accepts token %s when reCAPTCHA is unconfigured', async (recaptchaToken) => {
    const service = booking(); await setup(service);
    const response = await app!.inject({ method: 'POST', url: '/v1/public/appointments', payload: { ...validPayload, recaptchaToken } });
    expect(response.statusCode).toBe(201);
    expect(service.book).toHaveBeenCalledOnce();
  });
  it.each(['', undefined, '   '])('rejects missing token %s when reCAPTCHA is configured', async (recaptchaToken) => {
    vi.stubEnv('RECAPTCHA_SECRET_KEY', 'test-secret');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const service = booking(); await setup(service);
    const response = await app!.inject({ method: 'POST', url: '/v1/public/appointments', payload: { ...validPayload, recaptchaToken } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('RECAPTCHA_FAILED');
    expect(service.book).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([false, true])('requires successful reCAPTCHA verification: %s', async (success) => {
    vi.stubEnv('RECAPTCHA_SECRET_KEY', 'test-secret');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success })));
    vi.stubGlobal('fetch', fetchMock);
    const service = booking(); await setup(service);
    const response = await app!.inject({ method: 'POST', url: '/v1/public/appointments', payload: { ...validPayload, recaptchaToken: 'test-token' } });
    expect(response.statusCode).toBe(success ? 201 : 400);
    expect(service.book).toHaveBeenCalledTimes(success ? 1 : 0);
    expect(fetchMock).toHaveBeenCalledOnce();
    const params = fetchMock.mock.calls[0] as unknown as [string, { body: URLSearchParams }];
    expect(params[1].body.get('response')).toBe('test-token');
    if (!success) expect(response.json().error.code).toBe('RECAPTCHA_FAILED');
  });
  it('returns live availability without authentication', async () => { const service = booking(); await setup(service); const response = await app!.inject({ method: 'GET', url: `/v1/public/clinics/smile-bright/availability?branchId=${branchId}&serviceId=${serviceId}&date=2030-05-10` }); expect(response.statusCode).toBe(200); expect(response.json().data.slots).toHaveLength(1); expect(service.availability).toHaveBeenCalledWith({ clinicSlug: 'smile-bright', branchId, serviceId, date: '2030-05-10' }); });
  it('creates a pending appointment and returns a confirmation number', async () => { const service = booking(); await setup(service); const response = await app!.inject({ method: 'POST', url: '/v1/public/appointments', payload: { clinicSlug: 'smile-bright', branchId, serviceId, date: '2030-05-10', startsAt: '2030-05-10T01:00:00.000Z', patientFirstName: 'Ana', patientLastName: 'Santos', patientPhone: '+63 917 000 0000', patientEmail: 'ana@example.com', chiefComplaint: 'Routine cleaning', agreedToTerms: true, recaptchaToken: 'test-token' } }); expect(response.statusCode).toBe(201); expect(response.json().data).toMatchObject({ confirmationNumber: 'DNT-20300510-00000000', status: 'pending' }); });
  it('returns 409 when the transactional conflict check loses a race', async () => { const service = booking(); service.book = vi.fn(async () => { throw new PublicBookingError('SLOT_CONFLICT', 'That time was just booked.', 409); }); await setup(service); const response = await app!.inject({ method: 'POST', url: '/v1/public/appointments', payload: { clinicSlug: 'smile-bright', branchId, serviceId, date: '2030-05-10', startsAt: '2030-05-10T01:00:00.000Z', patientFirstName: 'Ana', patientLastName: 'Santos', patientPhone: '09170000000', patientEmail: 'ana@example.com', chiefComplaint: 'Routine cleaning', agreedToTerms: true, recaptchaToken: 'test-token' } }); expect(response.statusCode).toBe(409); expect(response.json().error.code).toBe('SLOT_CONFLICT'); });
  it('allows exactly one of two concurrent requests for the same slot', async () => {
    const service = booking();
    let claimed = false;
    service.book = vi.fn(async () => {
      await new Promise<void>((resolve) => setImmediate(resolve));
      if (claimed) throw new PublicBookingError('SLOT_CONFLICT', 'That time was just booked.', 409);
      claimed = true;
      return booking().book({} as never, {});
    });
    await setup(service);
    const request = { method: 'POST' as const, url: '/v1/public/appointments', payload: { clinicSlug: 'smile-bright', branchId, serviceId, dentistId, date: '2030-05-10', startsAt: '2030-05-10T01:00:00.000Z', patientFirstName: 'Ana', patientLastName: 'Santos', patientPhone: '09170000000', patientEmail: 'ana@example.com', chiefComplaint: 'Routine cleaning', agreedToTerms: true, recaptchaToken: 'test-token' } };
    const responses = await Promise.all([app!.inject(request), app!.inject(request)]);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409]);
    expect(service.book).toHaveBeenCalledTimes(2);
  });
  it('rejects malformed or client-injected booking fields', async () => { const service = booking(); await setup(service); const response = await app!.inject({ method: 'POST', url: '/v1/public/appointments', payload: { clinicSlug: 'smile-bright', clinicId, branchId, serviceId, date: '2030-05-10', startsAt: '2030-05-10T01:00:00.000Z', patientFirstName: 'Ana', patientLastName: 'Santos', patientPhone: '09170000000', patientEmail: 'ana@example.com', chiefComplaint: 'Cleaning', agreedToTerms: true, recaptchaToken: 'test-token' } }); expect(response.statusCode).toBe(400); expect(service.book).not.toHaveBeenCalled(); });
});

describe('appointment overlap rule', () => {
  const slot = { startsAt: '2030-05-10T01:00:00.000Z', endsAt: '2030-05-10T01:30:00.000Z' };
  it('rejects partial and containing overlaps but permits adjacent slots', () => {
    expect(overlaps(slot, [{ startsAt: new Date('2030-05-10T00:45:00.000Z'), endsAt: new Date('2030-05-10T01:15:00.000Z') }])).toBe(true);
    expect(overlaps(slot, [{ startsAt: new Date('2030-05-10T00:30:00.000Z'), endsAt: new Date('2030-05-10T02:00:00.000Z') }])).toBe(true);
    expect(overlaps(slot, [{ startsAt: new Date('2030-05-10T00:30:00.000Z'), endsAt: new Date('2030-05-10T01:00:00.000Z') }])).toBe(false);
  });
});
