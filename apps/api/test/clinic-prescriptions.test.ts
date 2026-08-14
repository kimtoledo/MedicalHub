import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import { buildApp } from '../src/app.js';
import { PrescriptionError, type ClinicPrescriptionService } from '../src/clinic/prescription-service.js';
import type { NotificationService } from '../src/notifications/service.js';
import type { EntitlementService } from '../src/entitlements/service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 3001,
  logLevel: 'silent',
  corsOrigins: [],
  authSecret: 'test-secret-that-is-at-least-32-characters',
  authBaseUrl: 'http://localhost:3001',
};

const clinicId = '00000000-0000-0000-0000-000000000101';
const dentistId = '00000000-0000-0000-0000-000000000401';
const otherDentistId = '00000000-0000-0000-0000-000000000402';
const prescriptionId = '00000000-0000-0000-0000-000000000501';

function contextFor(role: 'clinic_owner' | 'clinic_admin' | 'dentist' | 'dental_assistant', linkedDentistId: string | null = null): AuthorizationContext {
  return {
    user: { id: 'user', email: `${role}@test`, name: role, platformRole: null },
    strategies: ['clinicMember'],
    clinicMemberships: [{ clinicId, branchId: null, role, dentistId: linkedDentistId }],
  };
}

function auth(value: AuthorizationContext | null): AuthServices {
  return {
    handler: vi.fn(async () => new Response()),
    getSession: vi.fn(async () =>
      value ? { session: { id: 's', userId: value.user.id, expiresAt: new Date('2030-01-01') }, user: value.user } : null,
    ),
    resolveAuthorization: vi.fn(async () => value),
  };
}

const entitlements: EntitlementService = {
  resolve: vi.fn(async (id) => ({
    clinic: { id, name: 'Clinic', status: 'active', maintenanceMode: false },
    subscription: null,
    entitlements: [{ featureKey: FeatureKey.PRESCRIPTIONS, isEnabled: true, source: 'package' as const, expiresAt: null }],
  })),
};

function service(): ClinicPrescriptionService {
  return {
    getPrescriberDefaults: vi.fn(async () => ({ prcLicenseNumber: null, signatureUrl: null, templateId: 'classic' })),
    listFinalizedEncounters: vi.fn(async () => []),
    issuePrescription: vi.fn(async () => ({ prescriptionId })),
    listPrescriptions: vi.fn(async () => ({ data: [], total: 0, page: 1, pageSize: 20 })),
    getPrescription: vi.fn(async () => null),
    amendPrescription: vi.fn(async () => ({ prescriptionId })),
    updateDentistSignature: vi.fn(async () => undefined),
    updateDentistTemplate: vi.fn(async () => undefined),
    sharePrescriptionByEmail: vi.fn(async () => ({ notificationId: 'notif-1' })),
  };
}

const notifications = {} as NotificationService;

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

function fakeDb(dentistIsAssigned: boolean) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.from = () => builder;
  builder.where = () => builder;
  builder.limit = async () => (dentistIsAssigned ? [{ id: 'assignment-1' }] : []);
  return builder;
}

async function setup(value: AuthorizationContext | null, prescriptionService: ClinicPrescriptionService, db?: unknown) {
  app = await buildApp({
    config,
    checkDatabase: async () => undefined,
    logger: false,
    auth: auth(value),
    entitlements,
    clinicPrescription: prescriptionService,
    notifications,
    db: db as never,
  });
}

describe('clinic prescription signature/template/share-email routes', () => {
  it('rejects a clinic_admin saving a dentist signature', async () => {
    const prescriptionService = service();
    await setup(contextFor('clinic_admin'), prescriptionService);
    const response = await app!.inject({
      method: 'PUT',
      url: `/v1/clinic/${clinicId}/prescriptions/signature`,
      payload: { signatureData: 'data:image/png;base64,AAAA' },
    });
    expect(response.statusCode).toBe(403);
    expect(prescriptionService.updateDentistSignature).not.toHaveBeenCalled();
  });

  it('rejects a dental_assistant saving a prescription template', async () => {
    const prescriptionService = service();
    await setup(contextFor('dental_assistant'), prescriptionService);
    const response = await app!.inject({
      method: 'PATCH',
      url: `/v1/clinic/${clinicId}/prescriptions/template`,
      payload: { templateId: 'modern' },
    });
    expect(response.statusCode).toBe(403);
    expect(prescriptionService.updateDentistTemplate).not.toHaveBeenCalled();
  });

  it('saves a signature only to the caller\'s own dentist record, ignoring any dentistId in the body', async () => {
    const prescriptionService = service();
    await setup(contextFor('dentist', dentistId), prescriptionService);
    const response = await app!.inject({
      method: 'PUT',
      url: `/v1/clinic/${clinicId}/prescriptions/signature`,
      payload: { signatureData: 'data:image/png;base64,AAAA', dentistId: otherDentistId },
    });
    expect(response.statusCode).toBe(200);
    expect(prescriptionService.updateDentistSignature).toHaveBeenCalledWith(dentistId, 'data:image/png;base64,AAAA');
    expect(prescriptionService.updateDentistSignature).not.toHaveBeenCalledWith(otherDentistId, expect.anything());
  });

  it('returns 404 from share-email for a prescription belonging to a different clinic', async () => {
    // The caller has legitimate access to `clinicId`, but the requested
    // prescriptionId actually belongs to `otherClinicId`. The service's
    // clinic-scoped lookup (WHERE id = ? AND clinic_id = ?) finds no row and
    // throws NOT_FOUND — this asserts the route maps that to a 404 rather
    // than ever leaking another clinic's prescription.
    const prescriptionService = service();
    prescriptionService.sharePrescriptionByEmail = vi.fn(async () => {
      throw new PrescriptionError('NOT_FOUND', 'Prescription not found');
    });
    await setup(contextFor('clinic_owner'), prescriptionService);
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/clinic/${clinicId}/prescriptions/${prescriptionId}/share-email`,
      payload: { patientEmail: 'patient@example.com' },
    });
    expect(response.statusCode).toBe(404);
    expect(prescriptionService.sharePrescriptionByEmail).toHaveBeenCalledWith(clinicId, prescriptionId, 'patient@example.com', notifications);
  });

  it('lets a clinic_admin save a signature for an actively-assigned dentist', async () => {
    const prescriptionService = service();
    await setup(contextFor('clinic_admin'), prescriptionService, fakeDb(true));
    const response = await app!.inject({
      method: 'PUT',
      url: `/v1/clinic/${clinicId}/prescriptions/signature`,
      payload: { signatureData: 'data:image/png;base64,AAAA', dentistId },
    });
    expect(response.statusCode).toBe(200);
    expect(prescriptionService.updateDentistSignature).toHaveBeenCalledWith(dentistId, 'data:image/png;base64,AAAA');
  });

  it('rejects a clinic_admin attributing a signature to a dentist not assigned to the clinic', async () => {
    const prescriptionService = service();
    await setup(contextFor('clinic_admin'), prescriptionService, fakeDb(false));
    const response = await app!.inject({
      method: 'PUT',
      url: `/v1/clinic/${clinicId}/prescriptions/signature`,
      payload: { signatureData: 'data:image/png;base64,AAAA', dentistId },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('DENTIST_NOT_ASSIGNED');
    expect(prescriptionService.updateDentistSignature).not.toHaveBeenCalled();
  });
});

describe('clinic prescription issue/amend routes', () => {
  const encounterId = '00000000-0000-0000-0000-000000000601';
  const items = [{ medicineName: 'Amoxicillin' }];

  it('rejects a clinic_admin issuing a prescription with no attributed dentist', async () => {
    const prescriptionService = service();
    await setup(contextFor('clinic_admin'), prescriptionService);
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/clinic/${clinicId}/prescriptions`,
      payload: { encounterId, items },
    });
    expect(response.statusCode).toBe(403);
    expect(prescriptionService.issuePrescription).not.toHaveBeenCalled();
  });

  it('lets a clinic_admin issue a prescription attributed to an actively-assigned dentist', async () => {
    const prescriptionService = service();
    await setup(contextFor('clinic_admin'), prescriptionService, fakeDb(true));
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/clinic/${clinicId}/prescriptions`,
      payload: { encounterId, items, dentistId },
    });
    expect(response.statusCode).toBe(201);
    expect(prescriptionService.issuePrescription).toHaveBeenCalledWith(clinicId, expect.objectContaining({ callerDentistId: dentistId, issuedBy: 'user' }));
  });

  it('ignores a body dentistId when the caller is a dentist themselves', async () => {
    const prescriptionService = service();
    await setup(contextFor('dentist', dentistId), prescriptionService);
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/clinic/${clinicId}/prescriptions`,
      payload: { encounterId, items, dentistId: otherDentistId },
    });
    expect(response.statusCode).toBe(201);
    expect(prescriptionService.issuePrescription).toHaveBeenCalledWith(clinicId, expect.objectContaining({ callerDentistId: dentistId }));
  });

  it('lets a clinic_admin amend a prescription attributed to an actively-assigned dentist', async () => {
    const prescriptionService = service();
    await setup(contextFor('clinic_admin'), prescriptionService, fakeDb(true));
    const response = await app!.inject({
      method: 'POST',
      url: `/v1/clinic/${clinicId}/prescriptions/${prescriptionId}/amend`,
      payload: { items, dentistId },
    });
    expect(response.statusCode).toBe(201);
    expect(prescriptionService.amendPrescription).toHaveBeenCalledWith(clinicId, prescriptionId, expect.objectContaining({ callerDentistId: dentistId }));
  });
});
