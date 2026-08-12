import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import {
  BillingError,
  type ClinicBillingService,
  type ClinicServiceListService,
} from '../src/clinic/billing-service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';
import { FeatureKey } from '@dentra/shared';
import type { EntitlementService } from '../src/entitlements/service.js';

// ---------------------------------------------------------------------------
// Shared test config
// ---------------------------------------------------------------------------

const config: ApiConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 3001,
  logLevel: 'silent',
  corsOrigins: ['http://localhost:5000'],
  authSecret: 'test-secret-that-is-at-least-32-characters',
  authBaseUrl: 'http://localhost:3001',
};

const CLINIC_ID  = '33333333-3333-4333-8333-333333333333';
const OTHER_CLINIC = '44444444-4444-4444-8444-444444444444';
const INVOICE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SERVICE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const clinicMemberContext: AuthorizationContext = {
  user: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'clinic@example.test',
    name: 'Clinic User',
    platformRole: null,
  },
  strategies: ['clinicMember'],
  clinicMemberships: [
    { clinicId: CLINIC_ID, branchId: null, role: 'clinic_admin', dentistId: null },
  ],
};

const otherClinicContext: AuthorizationContext = {
  user: {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'other@example.test',
    name: 'Other Clinic User',
    platformRole: null,
  },
  strategies: ['clinicMember'],
  clinicMemberships: [
    { clinicId: OTHER_CLINIC, branchId: null, role: 'clinic_admin', dentistId: null },
  ],
};

// Branch A is the branch the caller belongs to; Branch B is a different branch.
const BRANCH_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const BRANCH_B = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

// A member scoped to Branch A — cannot access Branch B invoices/encounters.
const branchScopedContext: AuthorizationContext = {
  user: {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'branch@example.test',
    name: 'Branch User',
    platformRole: null,
  },
  strategies: ['clinicMember'],
  clinicMemberships: [
    { clinicId: CLINIC_ID, branchId: BRANCH_A, role: 'clinic_admin', dentistId: null },
  ],
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function createAuth(context: AuthorizationContext | null): AuthServices {
  return {
    handler: vi.fn(async () => new Response('{}')),
    getSession: vi.fn(async () =>
      context
        ? {
            session: {
              id: '44444444-4444-4444-8444-444444444444',
              userId: context.user.id,
              expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            },
            user: context.user,
          }
        : null),
    resolveAuthorization: vi.fn(async () => context),
  };
}

function createEntitlements(
  disabled: FeatureKey[] = [],
): EntitlementService {
  return {
    resolve: vi.fn(async (clinicId) => ({
      clinic: { id: clinicId, name: 'Test Clinic', status: 'active' },
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

function makeInvoice(overrides: Partial<Awaited<ReturnType<ClinicBillingService['getInvoice']>>> = {}) {
  return {
    id: INVOICE_ID,
    invoiceNumber: 'SBDINV000001',
    status: 'pending' as const,
    totalAmountPhp: '2000.00',
    issuedAt: new Date('2026-08-11T00:00:00.000Z'),
    paidAt: null,
    createdAt: new Date('2026-08-11T00:00:00.000Z'),
    encounterId: null,
    patient: { id: 'p1', firstName: 'Juan', lastName: 'Dela Cruz', patientNumber: 'SBD000001' },
    clinic: { name: 'Smile Bright', prefix: 'SBD', address: '123 Main St', city: 'Makati', phone: null, logoUrl: null },
    lineItems: [
      { id: 'li1', description: 'Cleaning', unitPricePhp: '2000.00', quantity: 1, totalPhp: '2000.00', toothRef: null, serviceId: null },
    ],
    payment: null,
    ...overrides,
  };
}

function createBillingService(overrides: Partial<ClinicBillingService> = {}): ClinicBillingService {
  return {
    listInvoices: vi.fn(async () => ({
      data: [makeInvoice()],
      total: 1,
      page: 1,
      pageSize: 20,
    })),
    getInvoice: vi.fn(async () => makeInvoice()),
    generateInvoice: vi.fn(async () => ({ invoiceId: INVOICE_ID, invoiceNumber: 'SBDINV000001' })),
    recordPayment: vi.fn(async () => undefined),
    getTodayEarnings: vi.fn(async () => ({ totalPhp: '5000.00', invoiceCount: 3 })),
    listUnbilledEncounters: vi.fn(async () => []),
    ...overrides,
  };
}

function createServiceListService(overrides: Partial<ClinicServiceListService> = {}): ClinicServiceListService {
  return {
    listServices: vi.fn(async () => [
      { id: SERVICE_ID, name: 'Cleaning', description: null, durationMinutes: '45', pricePhp: '800.00', isActive: 'true' },
    ]),
    updateServicePrice: vi.fn(async () => undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Route registration: billing routes register WITHOUT adminClinics
// ---------------------------------------------------------------------------

describe('Route registration', () => {
  it('registers billing routes without adminClinics service', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/services`,
      headers: { cookie: 'session=test' },
    });

    expect(res.statusCode).not.toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /v1/clinic/:clinicId/services
// ---------------------------------------------------------------------------

describe('GET /v1/clinic/:clinicId/services', () => {
  it('returns 401 when unauthenticated', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(null),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/services` });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when authenticated to a different clinic', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(otherClinicContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/services`,
      headers: { cookie: 'session=test' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns services for authorised member', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/services`,
      headers: { cookie: 'session=test' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PATCH /v1/clinic/:clinicId/services/:serviceId/price
// ---------------------------------------------------------------------------

describe('PATCH /v1/clinic/:clinicId/services/:serviceId/price', () => {
  it('returns 401 when unauthenticated', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(null),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/clinic/${CLINIC_ID}/services/${SERVICE_ID}/price`,
      payload: { pricePhp: '1500.00' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for cross-clinic access', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(otherClinicContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/clinic/${CLINIC_ID}/services/${SERVICE_ID}/price`,
      headers: { cookie: 'session=test' },
      payload: { pricePhp: '1500.00' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('updates price for authorised member', async () => {
    const svc = createServiceListService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: svc,
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/clinic/${CLINIC_ID}/services/${SERVICE_ID}/price`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify({ pricePhp: '1500.00' }),
    });
    expect(res.statusCode).toBe(200);
    expect(svc.updateServicePrice).toHaveBeenCalledWith(CLINIC_ID, SERVICE_ID, '1500.00');
  });

  it('accepts null price to clear pricing', async () => {
    const svc = createServiceListService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: svc,
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/clinic/${CLINIC_ID}/services/${SERVICE_ID}/price`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify({ pricePhp: null }),
    });
    expect(res.statusCode).toBe(200);
    expect(svc.updateServicePrice).toHaveBeenCalledWith(CLINIC_ID, SERVICE_ID, null);
  });
});

// ---------------------------------------------------------------------------
// GET /v1/clinic/:clinicId/invoices
// ---------------------------------------------------------------------------

describe('GET /v1/clinic/:clinicId/invoices', () => {
  it('returns 401 when unauthenticated', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(null),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/invoices` });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for cross-clinic access', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(otherClinicContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/invoices`,
      headers: { cookie: 'session=test' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('passes date-range and status filters to service', async () => {
    const billing = createBillingService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/invoices?status=paid&dateFrom=2026-01-01&dateTo=2026-08-11&page=2`,
      headers: { cookie: 'session=test' },
    });
    expect(res.statusCode).toBe(200);
    expect(billing.listInvoices).toHaveBeenCalledWith(CLINIC_ID, {
      search: '',
      status: 'paid',
      dateFrom: '2026-01-01',
      dateTo: '2026-08-11',
      page: 2,
      pageSize: 20,
      callerBranchIds: null, // clinic-wide context → no branch restriction
    });
  });
});

// ---------------------------------------------------------------------------
// POST /v1/clinic/:clinicId/invoices — generate invoice
// ---------------------------------------------------------------------------

describe('POST /v1/clinic/:clinicId/invoices', () => {
  const ENCOUNTER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  it('returns 401 when unauthenticated', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(null),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices`,
      payload: { encounterId: ENCOUNTER_ID },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for cross-clinic access', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(otherClinicContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify({ encounterId: ENCOUNTER_ID }),
    });
    expect(res.statusCode).toBe(403);
  });

  it('generates an invoice and returns invoiceId', async () => {
    const billing = createBillingService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify({ encounterId: ENCOUNTER_ID }),
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { success: boolean; data: { invoiceId: string } };
    expect(body.success).toBe(true);
    expect(body.data.invoiceId).toBe(INVOICE_ID);
    // branchId is no longer in the request — derived from encounter server-side
    expect(billing.generateInvoice).toHaveBeenCalledWith(
      CLINIC_ID,
      ENCOUNTER_ID,
      expect.any(String),
      null, // clinic-wide caller → no branch restriction
    );
  });

  it('returns 422 when encounter is not finalised', async () => {
    const billing = createBillingService({
      generateInvoice: vi.fn(async () => {
        throw new BillingError('INVALID_STATE', 'Encounter must be finalized before invoicing');
      }),
    });
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify({ encounterId: ENCOUNTER_ID }),
    });
    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_STATE');
  });

  it('returns 409 when invoice already exists for encounter', async () => {
    const billing = createBillingService({
      generateInvoice: vi.fn(async () => {
        throw new BillingError('CONFLICT', 'An invoice already exists for this encounter');
      }),
    });
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify({ encounterId: ENCOUNTER_ID }),
    });
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('CONFLICT');
  });

  it('returns 403 when branch-scoped caller tries to invoice an encounter in another branch', async () => {
    const billing = createBillingService({
      generateInvoice: vi.fn(async () => {
        throw new BillingError('FORBIDDEN', 'You do not have access to this encounter');
      }),
    });
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(branchScopedContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify({ encounterId: ENCOUNTER_ID }),
    });
    expect(res.statusCode).toBe(403);
    // Confirm branch array was passed to service
    expect(billing.generateInvoice).toHaveBeenCalledWith(
      CLINIC_ID,
      ENCOUNTER_ID,
      expect.any(String),
      [BRANCH_A], // caller's branch(es) as array
    );
  });
});

// ---------------------------------------------------------------------------
// POST /v1/clinic/:clinicId/invoices/:invoiceId/pay — record payment
// ---------------------------------------------------------------------------

describe('POST /v1/clinic/:clinicId/invoices/:invoiceId/pay', () => {
  const paymentPayload = {
    amountPhp: '2000.00',
    paymentMethod: 'gcash',
    paymentDate: '2026-08-11',
  };

  it('returns 401 when unauthenticated', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(null),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/pay`,
      payload: paymentPayload,
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for cross-clinic access', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(otherClinicContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/pay`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify(paymentPayload),
    });
    expect(res.statusCode).toBe(403);
  });

  it('records payment for authorised member', async () => {
    const billing = createBillingService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/pay`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify(paymentPayload),
    });
    expect(res.statusCode).toBe(200);
    expect(billing.recordPayment).toHaveBeenCalledWith(
      CLINIC_ID,
      INVOICE_ID,
      expect.objectContaining({ amountPhp: '2000.00', paymentMethod: 'gcash', paymentDate: '2026-08-11' }),
    );
  });

  it('returns 422 when paying an already-paid invoice', async () => {
    const billing = createBillingService({
      recordPayment: vi.fn(async () => {
        throw new BillingError('INVALID_STATE', 'Only pending invoices can be paid');
      }),
    });
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/pay`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify(paymentPayload),
    });
    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_STATE');
  });

  it('returns 400 when amount does not match invoice total', async () => {
    const billing = createBillingService({
      recordPayment: vi.fn(async () => {
        throw new BillingError('INVALID_AMOUNT', 'Payment amount must equal invoice total');
      }),
    });
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/pay`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify({ ...paymentPayload, amountPhp: '1.00' }),
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_AMOUNT');
  });

  it('returns 403 when branch-scoped caller tries to pay an invoice in another branch', async () => {
    const billing = createBillingService({
      recordPayment: vi.fn(async () => {
        throw new BillingError('FORBIDDEN', 'You do not have access to this invoice');
      }),
    });
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(branchScopedContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/pay`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify(paymentPayload),
    });
    expect(res.statusCode).toBe(403);
    expect(billing.recordPayment).toHaveBeenCalledWith(
      CLINIC_ID,
      INVOICE_ID,
      expect.objectContaining({ callerBranchIds: [BRANCH_A] }),
    );
  });

  it('rejects invalid payment method', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/pay`,
      headers: { cookie: 'session=test', 'content-type': 'application/json' },
      payload: JSON.stringify({ ...paymentPayload, paymentMethod: 'bitcoin' }),
    });
    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /v1/clinic/:clinicId/earnings/today
// ---------------------------------------------------------------------------

describe('GET /v1/clinic/:clinicId/earnings/today', () => {
  it('returns 401 when unauthenticated', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(null),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/earnings/today` });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for cross-clinic access', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(otherClinicContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/earnings/today`,
      headers: { cookie: 'session=test' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns today earnings for authorised member', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/earnings/today`,
      headers: { cookie: 'session=test' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: { totalPhp: string; invoiceCount: number } };
    expect(body.success).toBe(true);
    expect(body.data.totalPhp).toBe('5000.00');
    expect(body.data.invoiceCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// GET /v1/clinic/:clinicId/invoices/unbilled
// ---------------------------------------------------------------------------

describe('GET /v1/clinic/:clinicId/invoices/unbilled', () => {
  it('returns 401 when unauthenticated', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(null),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({ method: 'GET', url: `/v1/clinic/${CLINIC_ID}/invoices/unbilled` });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for cross-clinic access', async () => {
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(otherClinicContext),
      entitlements: createEntitlements(),
      clinicBilling: createBillingService(),
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/invoices/unbilled`,
      headers: { cookie: 'session=test' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('passes callerBranchIds to service for branch-scoped caller (single branch)', async () => {
    const billing = createBillingService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(branchScopedContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/invoices/unbilled`,
      headers: { cookie: 'session=test' },
    });
    expect(billing.listUnbilledEncounters).toHaveBeenCalledWith(CLINIC_ID, [BRANCH_A]);
  });

  it('passes callerBranchIds as array for multi-branch member', async () => {
    const multiBranchContext: AuthorizationContext = {
      user: {
        id: '77777777-7777-4777-8777-777777777777',
        email: 'multi@example.test',
        name: 'Multi Branch User',
        platformRole: null,
      },
      strategies: ['clinicMember'],
      clinicMemberships: [
        { clinicId: CLINIC_ID, branchId: BRANCH_A, role: 'clinic_admin', dentistId: null },
        { clinicId: CLINIC_ID, branchId: BRANCH_B, role: 'clinic_admin', dentistId: null },
      ],
    };
    const billing = createBillingService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(multiBranchContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/invoices/unbilled`,
      headers: { cookie: 'session=test' },
    });
    expect(billing.listUnbilledEncounters).toHaveBeenCalledWith(CLINIC_ID, [BRANCH_A, BRANCH_B]);
  });

  it('returns list of unbilled encounters', async () => {
    const billing = createBillingService({
      listUnbilledEncounters: vi.fn(async () => [
        {
          id: 'enc1',
          date: '2026-08-10',
          patientId: 'p1',
          patientFirstName: 'Juan',
          patientLastName: 'Dela Cruz',
          patientNumber: 'SBD000001',
          status: 'final',
          chiefComplaint: 'Tooth pain',
          treatmentCount: 2,
          branchId: 'br1',
        },
      ]),
    });
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements(),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/invoices/unbilled`,
      headers: { cookie: 'session=test' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('billing entitlements', () => {
  it('blocks direct invoice API access when billing invoices are disabled', async () => {
    const billing = createBillingService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements([FeatureKey.BILLING_INVOICES]),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clinic/${CLINIC_ID}/invoices`,
      headers: { cookie: 'session=test' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ENTITLEMENT_REQUIRED');
    expect(billing.listInvoices).not.toHaveBeenCalled();
  });

  it('blocks direct payment API access when billing payments are disabled', async () => {
    const billing = createBillingService();
    app = await buildApp({
      config,
      checkDatabase: vi.fn(async () => undefined),
      auth: createAuth(clinicMemberContext),
      entitlements: createEntitlements([FeatureKey.BILLING_PAYMENTS]),
      clinicBilling: billing,
      clinicServiceList: createServiceListService(),
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/pay`,
      headers: { cookie: 'session=test' },
      payload: {
        amountPhp: '2000.00',
        paymentMethod: 'cash',
        paymentDate: '2026-08-12',
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ENTITLEMENT_REQUIRED');
    expect(billing.recordPayment).not.toHaveBeenCalled();
  });
});

describe('full billing transactions', () => {
  it('accepts partial payments and exposes remaining balance workflow', async () => {
    const billing = createBillingService({ recordPayment: vi.fn(async () => undefined) });
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: createAuth(clinicMemberContext), entitlements: createEntitlements(), clinicBilling: billing, clinicServiceList: createServiceListService() });
    const response = await app.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/pay`, headers: { cookie: 'session=test', 'content-type': 'application/json' }, payload: { amountPhp: '750.00', paymentMethod: 'cash', paymentDate: '2026-08-12' } });
    expect(response.statusCode).toBe(200);
    expect(billing.recordPayment).toHaveBeenCalledWith(CLINIC_ID, INVOICE_ID, expect.objectContaining({ amountPhp: '750.00' }));
  });

  it('guards refund and adjustment endpoints with role, feature, and reason validation', async () => {
    const billing = createBillingService({ recordRefund: vi.fn(async () => undefined), recordAdjustment: vi.fn(async () => undefined) });
    app = await buildApp({ config, checkDatabase: vi.fn(async () => undefined), auth: createAuth(clinicMemberContext), entitlements: createEntitlements(), clinicBilling: billing, clinicServiceList: createServiceListService() });
    const refund = await app.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/refund`, headers: { cookie: 'session=test', 'content-type': 'application/json' }, payload: { amountPhp: '100.00', transactionDate: '2026-08-12', reason: 'Patient request', paymentMethod: 'cash' } });
    expect(refund.statusCode).toBe(200);
    const adjustment = await app.inject({ method: 'POST', url: `/v1/clinic/${CLINIC_ID}/invoices/${INVOICE_ID}/adjustment`, headers: { cookie: 'session=test', 'content-type': 'application/json' }, payload: { amountPhp: '100.00', transactionDate: '2026-08-12', reason: 'Approved courtesy adjustment' } });
    expect(adjustment.statusCode).toBe(200);
    expect(billing.recordRefund).toHaveBeenCalled();
    expect(billing.recordAdjustment).toHaveBeenCalled();
  });
});
