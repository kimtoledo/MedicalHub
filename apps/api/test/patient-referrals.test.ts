import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import { PatientReferralError, type PatientReferralService } from '../src/clinic/patient-referrals-service.js';
import type { EntitlementService } from '../src/entitlements/service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: [], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const clinicId = '00000000-0000-0000-0000-000000000101';
const targetClinicId = '00000000-0000-0000-0000-000000000201';
const patientId = '00000000-0000-0000-0000-000000000301';
const referralId = '00000000-0000-0000-0000-000000000401';

const owner: AuthorizationContext = { user: { id: 'user', email: 'owner@test', name: 'Owner', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId, branchId: null, role: 'clinic_owner', dentistId: null }] };
const dentist: AuthorizationContext = { ...owner, clinicMemberships: [{ clinicId, branchId: null, role: 'dentist', dentistId: 'dentist-a' }] };
const receptionist: AuthorizationContext = { ...owner, clinicMemberships: [{ clinicId, branchId: null, role: 'receptionist', dentistId: null }] };
const targetOwner: AuthorizationContext = { ...owner, clinicMemberships: [{ clinicId: targetClinicId, branchId: null, role: 'clinic_owner', dentistId: null }] };

const auth = (context: AuthorizationContext | null): AuthServices => ({ handler: vi.fn(async () => new Response()), getSession: vi.fn(async () => context ? { session: { id: 'session', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user } : null), resolveAuthorization: vi.fn(async () => context) });
const entitlements = (): EntitlementService => ({ resolve: vi.fn(async (id) => ({ clinic: { id, name: 'Clinic', status: 'active', maintenanceMode: false }, subscription: null, entitlements: [FeatureKey.PATIENTS_MANAGE, FeatureKey.PATIENT_REFERRALS].map((featureKey) => ({ featureKey, isEnabled: true, source: 'package' as const, expiresAt: null })) })) });

function referralsService(overrides: Partial<PatientReferralService> = {}): PatientReferralService {
  return {
    create: vi.fn(async () => ({ id: referralId, status: 'pending' as const })),
    listForClinic: vi.fn(async () => []),
    accept: vi.fn(async () => ({ referral: { id: referralId, status: 'accepted' as const }, patient: { id: 'new-patient', patientNumber: 'ABC000001' } })),
    decline: vi.fn(async () => ({ id: referralId, status: 'declined' as const })),
    ...overrides,
  } as unknown as PatientReferralService;
}

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(context: AuthorizationContext | null, service: PatientReferralService) {
  app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth: auth(context), entitlements: entitlements(), patientReferrals: service });
}

describe('patient referral routes', () => {
  it('lets a dentist create a referral with explicit consent', async () => {
    const service = referralsService();
    await setup(dentist, service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/patient-referrals?clinicId=${clinicId}`, payload: { sourcePatientId: patientId, targetClinicId, reason: 'Referring for orthodontic consult at the group branch.', consented: true } });
    expect(response.statusCode).toBe(201);
    expect(service.create).toHaveBeenCalledWith(clinicId, patientId, targetClinicId, { reason: 'Referring for orthodontic consult at the group branch.', consented: true }, expect.objectContaining({ id: 'user' }));
  });

  it('denies a receptionist from creating a referral', async () => {
    const service = referralsService();
    await setup(receptionist, service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/patient-referrals?clinicId=${clinicId}`, payload: { sourcePatientId: patientId, targetClinicId, reason: 'Referring for orthodontic consult.', consented: true } });
    expect(response.statusCode).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects a referral missing explicit consent at the route boundary', async () => {
    const service = referralsService();
    await setup(dentist, service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/patient-referrals?clinicId=${clinicId}`, payload: { sourcePatientId: patientId, targetClinicId, reason: 'Referring for orthodontic consult.' } });
    expect(response.statusCode).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('surfaces a service-level consent error', async () => {
    const service = referralsService({ create: vi.fn(async () => { throw new PatientReferralError('CONSENT_REQUIRED', 'Explicit patient consent is required before referring a patient', 422); }) });
    await setup(dentist, service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/patient-referrals?clinicId=${clinicId}`, payload: { sourcePatientId: patientId, targetClinicId, reason: 'Referring for orthodontic consult.', consented: false } });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('CONSENT_REQUIRED');
  });

  it('surfaces a cross-organization conflict from the service', async () => {
    const service = referralsService({ create: vi.fn(async () => { throw new PatientReferralError('CLINIC_NOT_IN_ORGANIZATION', 'Both clinics must belong to the same organization', 403); }) });
    await setup(dentist, service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/patient-referrals?clinicId=${clinicId}`, payload: { sourcePatientId: patientId, targetClinicId, reason: 'Referring for orthodontic consult.', consented: true } });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('CLINIC_NOT_IN_ORGANIZATION');
  });

  it('lists referrals visible to a clinic (source or target)', async () => {
    const service = referralsService({ listForClinic: vi.fn(async () => [{ id: referralId, status: 'pending' as const }]) as never });
    await setup(owner, service);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/patient-referrals?clinicId=${clinicId}` });
    expect(response.statusCode).toBe(200);
    expect(service.listForClinic).toHaveBeenCalledWith(clinicId);
  });

  it('lets the target clinic owner accept a referral', async () => {
    const service = referralsService();
    await setup(targetOwner, service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/patient-referrals/${referralId}/accept?clinicId=${targetClinicId}` });
    expect(response.statusCode).toBe(200);
    expect(service.accept).toHaveBeenCalledWith(referralId, targetClinicId, expect.objectContaining({ id: 'user' }));
    expect(response.json().data.patient.patientNumber).toBe('ABC000001');
  });

  it('denies a dentist (non-admin) from accepting a referral', async () => {
    const service = referralsService();
    const targetDentist: AuthorizationContext = { ...owner, clinicMemberships: [{ clinicId: targetClinicId, branchId: null, role: 'dentist', dentistId: 'dentist-b' }] };
    await setup(targetDentist, service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/patient-referrals/${referralId}/accept?clinicId=${targetClinicId}` });
    expect(response.statusCode).toBe(403);
    expect(service.accept).not.toHaveBeenCalled();
  });

  it('lets the target clinic owner decline a referral', async () => {
    const service = referralsService();
    await setup(targetOwner, service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/patient-referrals/${referralId}/decline?clinicId=${targetClinicId}` });
    expect(response.statusCode).toBe(200);
    expect(service.decline).toHaveBeenCalledWith(referralId, targetClinicId, expect.objectContaining({ id: 'user' }));
  });

  it('surfaces a not-found error when accepting a non-pending referral', async () => {
    const service = referralsService({ accept: vi.fn(async () => { throw new PatientReferralError('REFERRAL_NOT_FOUND', 'Pending referral not found for this clinic', 404); }) });
    await setup(targetOwner, service);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/patient-referrals/${referralId}/accept?clinicId=${targetClinicId}` });
    expect(response.statusCode).toBe(404);
  });
});
