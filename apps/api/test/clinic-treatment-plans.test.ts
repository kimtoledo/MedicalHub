import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ClinicTreatmentPlansService } from '../src/clinic/treatment-plans-service.js';
import type { EntitlementService } from '../src/entitlements/service.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: [], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const clinicId = '00000000-0000-0000-0000-000000000101';
const patientId = '00000000-0000-0000-0000-000000000301';
const dentistId = '00000000-0000-0000-0000-000000000401';
const serviceId = '00000000-0000-0000-0000-000000000601';
const planId = '00000000-0000-0000-0000-000000000701';

const dentistContext: AuthorizationContext = { user: { id: 'user', email: 'dentist@test', name: 'Dentist', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId, branchId: null, role: 'dentist', dentistId }] };
const receptionistContext: AuthorizationContext = { user: { id: 'user-2', email: 'reception@test', name: 'Receptionist', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId, branchId: null, role: 'receptionist', dentistId: null }] };

function auth(context: AuthorizationContext | null): AuthServices { return { handler: vi.fn(async () => new Response()), getSession: vi.fn(async () => context ? { session: { id: 's', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user } : null), resolveAuthorization: vi.fn(async () => context) }; }
const entitlements: EntitlementService = { resolve: vi.fn(async () => ({ clinic: { id: clinicId, name: 'Clinic', status: 'active' }, subscription: null, entitlements: [{ featureKey: FeatureKey.TREATMENT_PLANS, isEnabled: true, source: 'package' as const, expiresAt: null }] })) };
function service(): ClinicTreatmentPlansService { return { listForPatient: vi.fn(async () => []), get: vi.fn(async () => null), create: vi.fn(async () => ({ id: planId })), updatePlan: vi.fn(async () => ({ id: planId, status: 'approved' as const })), updateItemStatus: vi.fn(async () => ({ id: 'item', status: 'accepted' as const })) }; }
let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });
async function setup(context: AuthorizationContext | null, treatmentPlans: ClinicTreatmentPlansService) { app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth: auth(context), entitlements, clinicTreatmentPlans: treatmentPlans }); }

describe('clinic treatment plan routes', () => {
  it('requires a treatment-plan entitlement and clinical role to list plans', async () => {
    const plans = service(); await setup(receptionistContext, plans);
    const response = await app!.inject({ method: 'GET', url: `/v1/clinic/patients/${patientId}/treatment-plans?clinicId=${clinicId}` });
    expect(response.statusCode).toBe(403); expect(plans.listForPatient).not.toHaveBeenCalled();
  });

  it('derives the linked dentist when creating a plan', async () => {
    const plans = service(); await setup(dentistContext, plans);
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/patients/${patientId}/treatment-plans?clinicId=${clinicId}`, payload: { title: 'Restorative care', items: [{ serviceId, estimatedFeePhp: '2000.00', sequence: 1 }] } });
    expect(response.statusCode).toBe(201);
    expect(plans.create).toHaveBeenCalledWith(clinicId, patientId, dentistId, expect.objectContaining({ title: 'Restorative care' }), expect.objectContaining({ id: dentistContext.user.id }));
  });

  it('passes a completed item status to the service for treatment-record validation', async () => {
    const plans = service(); await setup(dentistContext, plans);
    const response = await app!.inject({ method: 'PATCH', url: `/v1/clinic/treatment-plans/${planId}/items/00000000-0000-0000-0000-000000000801/status?clinicId=${clinicId}`, payload: { status: 'completed' } });
    expect(response.statusCode).toBe(200);
    expect(plans.updateItemStatus).toHaveBeenCalledWith(clinicId, planId, '00000000-0000-0000-0000-000000000801', dentistId, { status: 'completed' }, expect.anything());
  });
});
