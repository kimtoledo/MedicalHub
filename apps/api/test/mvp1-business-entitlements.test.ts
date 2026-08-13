import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { FeatureKey } from '@dentra/shared';
import type { DB } from '@dentra/db';
import { branches, patients } from '@dentra/db/schema';
import { buildApp } from '../src/app.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import {
  createClinicFilesService,
  type ClinicFilesService,
} from '../src/clinic/clinical-files-service.js';
import type { ClinicPrescriptionService } from '../src/clinic/prescription-service.js';
import type { ApiConfig } from '../src/config.js';
import type { EntitlementService } from '../src/entitlements/service.js';

const config: ApiConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 3001,
  logLevel: 'silent',
  corsOrigins: ['http://localhost:5000'],
  authSecret: 'test-secret-that-is-at-least-32-characters',
  authBaseUrl: 'http://localhost:3001',
};

const CLINIC_ID = '33333333-3333-4333-8333-333333333333';
const DENTIST_ID = '44444444-4444-4444-8444-444444444444';
const ENCOUNTER_ID = '55555555-5555-4555-8555-555555555555';

const dentistContext: AuthorizationContext = {
  user: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'dentist@example.test',
    name: 'Test Dentist',
    platformRole: null,
  },
  strategies: ['clinicMember'],
  clinicMemberships: [
    { clinicId: CLINIC_ID, branchId: null, role: 'dentist', dentistId: DENTIST_ID },
  ],
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function createAuth(context: AuthorizationContext): AuthServices {
  return {
    handler: vi.fn(async () => new Response('{}')),
    getSession: vi.fn(async () => ({
      session: {
        id: '66666666-6666-4666-8666-666666666666',
        userId: context.user.id,
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      },
      user: context.user,
    })),
    resolveAuthorization: vi.fn(async () => context),
  };
}

function createEntitlements(disabled: FeatureKey[] = []): EntitlementService {
  return {
    resolve: vi.fn(async (clinicId) => ({
      clinic: { id: clinicId, name: 'Test Clinic', status: 'active', maintenanceMode: false },
      subscription: null,
      entitlements: Object.values(FeatureKey).map((featureKey) => ({
        featureKey,
        isEnabled: !disabled.includes(featureKey),
        source: 'override' as const,
        expiresAt: null,
      })),
    })),
  };
}

function createPrescriptionService(): ClinicPrescriptionService {
  return {
    getPrescriberDefaults: vi.fn(async () => ({ prcLicenseNumber: 'PRC-12345' })),
    listFinalizedEncounters: vi.fn(async () => [{
      id: ENCOUNTER_ID,
      date: '2026-08-12',
      branchId: '77777777-7777-4777-8777-777777777777',
      patientId: '88888888-8888-4888-8888-888888888888',
      patientFirstName: 'Juan',
      patientLastName: 'Dela Cruz',
      patientNumber: 'SBD000001',
      chiefComplaint: null,
    }]),
    issuePrescription: vi.fn(async () => ({ prescriptionId: '99999999-9999-4999-8999-999999999999' })),
    listPrescriptions: vi.fn(async () => ({ data: [], total: 0, page: 1, pageSize: 20 })),
    getPrescription: vi.fn(async () => null),
    amendPrescription: vi.fn(async () => ({ prescriptionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })),
  };
}

function createFilesService(): ClinicFilesService {
  return {
    uploadFile: vi.fn(async () => ({ fileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })),
    listFiles: vi.fn(async () => ({ data: [], total: 0, page: 1, pageSize: 20 })),
    getFile: vi.fn(async () => null),
    generateSignedUrl: vi.fn(async () => ({ downloadUrl: '/download' })),
    streamFile: vi.fn(async () => null),
    deleteFile: vi.fn(async () => undefined),
  };
}

describe('MVP1 business feature entitlements', () => {
  it('blocks direct prescription API access when prescriptions are disabled', async () => {
    const prescriptions = createPrescriptionService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(dentistContext),
      entitlements: createEntitlements([FeatureKey.PRESCRIPTIONS]),
      clinicPrescription: prescriptions,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/prescriptions`,
      headers: { cookie: 'session=test' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('ENTITLEMENT_REQUIRED');
    expect(prescriptions.listPrescriptions).not.toHaveBeenCalled();
  });

  it('returns finalized encounters with the authenticated dentist PRC default', async () => {
    const prescriptions = createPrescriptionService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(dentistContext),
      entitlements: createEntitlements(),
      clinicPrescription: prescriptions,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/prescriptions/encounters`,
      headers: { cookie: 'session=test' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.prcLicenseNumber).toBe('PRC-12345');
    expect(response.json().data.encounters).toHaveLength(1);
    expect(prescriptions.getPrescriberDefaults).toHaveBeenCalledWith(DENTIST_ID);
  });

  it('blocks direct clinical file API access when radiographs are disabled', async () => {
    const files = createFilesService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(dentistContext),
      entitlements: createEntitlements([FeatureKey.RADIOGRAPHS]),
      clinicFiles: files,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/files`,
      headers: { cookie: 'session=test' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('ENTITLEMENT_REQUIRED');
    expect(files.listFiles).not.toHaveBeenCalled();
  });
});

describe('clinical file tenant validation', () => {
  it('rejects a patient that does not belong to the selected clinic before storage', async () => {
    const select = vi.fn(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => table === branches ? [{ id: 'branch' }] : table === patients ? [] : []),
        })),
      })),
    }));
    const service = createClinicFilesService({ select } as unknown as DB);

    await expect(service.uploadFile(CLINIC_ID, {
      buffer: Buffer.from('not uploaded'),
      originalFilename: 'xray.png',
      mimeType: 'image/png',
      sizeBytes: 12,
      fileType: 'radiograph',
      patientId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      branchId: '77777777-7777-4777-8777-777777777777',
      uploadedBy: dentistContext.user.id,
      callerBranchIds: null,
    })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
