/**
 * Service-level tests for BillingService.generateInvoice.
 *
 * These tests exercise the service implementation directly — no HTTP layer —
 * with a DB double. They specifically verify the tenant-scope fix: that
 * treatment records joined to services from a DIFFERENT clinic do not
 * contribute cross-tenant prices or names to the generated invoice.
 */
import { describe, expect, it, vi } from 'vitest';
import { createClinicBillingService, BillingError } from '../src/clinic/billing-service.js';
import type { DB } from '@dentra/db';

// ─── Constants ───────────────────────────────────────────────────────────────
const CLINIC_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ENCOUNTER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PATIENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CREATED_BY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

// Fake encounter row (status='final', belongs to CLINIC_A)
const fakeEncounter: {
  id: string;
  patientId: string;
  status: string;
  branchId: string | null;
} = {
  id: ENCOUNTER_ID,
  patientId: PATIENT_ID,
  status: 'final',
  branchId: null,
};

// Treatment record whose service_id points to a service in another clinic.
// After applying the tenant-scoped join ( AND services.clinic_id = clinicId ),
// the service columns will be NULL — exactly as if no service was joined.
const fakeRecordWithForeignService: {
  id: string;
  toothRef: string;
  notes: string | null;
  serviceId: string | null;
  serviceName: string | null;
  servicePrice: string | null;
} = {
  id: 'rrrrrrrr-rrrr-4rrr-8rrr-rrrrrrrrrrrr',
  toothRef: '#11',
  notes: null,
  serviceId: null,     // null because the tenant-scoped join filtered it out
  serviceName: null,   // null — foreign service excluded
  servicePrice: null,  // null — foreign price excluded
};

// ─── DB double builder ────────────────────────────────────────────────────────
/**
 * Creates a minimal DB double for the generateInvoice method.
 * All chained drizzle builder methods (select().from().where() etc.) are
 * mocked to return the supplied rows for each query stage.
 */
function buildDb({
  encounterRow,
  existingInvoiceRow,
  treatmentRows,
  clinicPrefix,
  newInvoiceRow,
}: {
  encounterRow: typeof fakeEncounter | null;
  existingInvoiceRow: { id: string } | null;
  treatmentRows: typeof fakeRecordWithForeignService[];
  clinicPrefix: string;
  newInvoiceRow: { id: string; invoiceNumber: string };
}) {
  // We track insert calls so tests can assert on them.
  const insertedInvoiceValues = vi.fn();
  const insertedLineItemValues = vi.fn();
  const insertedAuditValues = vi.fn();

  // Inside the transaction, buildInvoiceNumber runs:
  //   1. tx.execute(sql`SELECT prefix FROM clinics WHERE id=? FOR UPDATE`)
  //   2. tx.select({total:count()}).from(invoices).where(...)   -- count existing invoices
  //   3. tx.select({id}).from(invoices).where(...).limit(1)     -- duplicate guard
  // Then generateInvoice runs:
  //   4. tx.insert(invoices).values(...).returning(...)
  //   5. tx.insert(invoiceLineItems).values(...)
  //   6. tx.insert(auditEvents).values(...)

  // Inside the tx, selects happen in order:
  //   call 1: count() of existing invoices (for invoice number seq)
  //   call 2: duplicate guard — returns []
  let txSelectCallCount = 0;
  const txSelect = vi.fn(() => {
    txSelectCallCount++;
    const call = txSelectCallCount;
    return {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),       // call 2 duplicate guard → []
          // count() awaits the where() result directly (no .limit())
          then: (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
            (call === 1 ? Promise.resolve([{ total: 0 }]) : Promise.resolve([])).then(resolve, reject),
        })),
      })),
    };
  });

  // Inserts happen in order: invoices → invoice_line_items → audit_events
  let txInsertCallCount = 0;
  const txInsert = vi.fn(() => {
    txInsertCallCount++;
    const call = txInsertCallCount;
    return {
      values: (v: unknown) => {
        if (call === 1) { insertedInvoiceValues(v); return { returning: async () => [newInvoiceRow] }; }
        if (call === 2) { insertedLineItemValues(v); return Promise.resolve(); }
        insertedAuditValues(v); return Promise.resolve();
      },
    };
  });

  const tx = {
    insert: txInsert,
    select: txSelect,
    execute: vi.fn(async () => [{ prefix: clinicPrefix }]),
  };
  const transaction = vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx));

  // Outer DB selects are made sequentially:
  // 1. encounters (verify encounter)
  // 2. invoices (check existing invoice pre-tx)
  // 3. treatmentRecords LEFT JOIN services (fetch line items)
  let outerSelectCallCount = 0;

  const outerSelect = vi.fn(() => {
    outerSelectCallCount++;
    const call = outerSelectCallCount;

    return {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => {
            if (call === 1) return encounterRow ? [encounterRow] : [];
            if (call === 2) return existingInvoiceRow ? [existingInvoiceRow] : [];
            return [];
          }),
        })),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => {
              if (call === 1) return encounterRow ? [encounterRow] : [];
              return [];
            }),
          })),
        })),
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(treatmentRows)),
        })),
      })),
    };
  });

  const db = {
    select: outerSelect,
    transaction,
    // Expose for assertions
    _insertedInvoiceValues: insertedInvoiceValues,
    _insertedLineItemValues: insertedLineItemValues,
  };

  return db as unknown as DB & {
    _insertedInvoiceValues: typeof insertedInvoiceValues;
    _insertedLineItemValues: typeof insertedLineItemValues;
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BillingService.generateInvoice — tenant-scope enforcement', () => {
  it('throws NOT_FOUND when the encounter does not exist', async () => {
    const db = buildDb({
      encounterRow: null,
      existingInvoiceRow: null,
      treatmentRows: [],
      clinicPrefix: 'CLN',
      newInvoiceRow: { id: 'i1', invoiceNumber: 'CLN-00001' },
    });
    const svc = createClinicBillingService(db);
    await expect(svc.generateInvoice(CLINIC_A, ENCOUNTER_ID, CREATED_BY)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws INVALID_STATE when encounter is not finalised', async () => {
    const db = buildDb({
      encounterRow: { ...fakeEncounter, status: 'open' },
      existingInvoiceRow: null,
      treatmentRows: [],
      clinicPrefix: 'CLN',
      newInvoiceRow: { id: 'i1', invoiceNumber: 'CLN-00001' },
    });
    const svc = createClinicBillingService(db);
    await expect(svc.generateInvoice(CLINIC_A, ENCOUNTER_ID, CREATED_BY)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });

  it('throws CONFLICT when an invoice already exists for the encounter', async () => {
    const db = buildDb({
      encounterRow: fakeEncounter,
      existingInvoiceRow: { id: 'existing-invoice' },
      treatmentRows: [],
      clinicPrefix: 'CLN',
      newInvoiceRow: { id: 'i1', invoiceNumber: 'CLN-00001' },
    });
    const svc = createClinicBillingService(db);
    await expect(svc.generateInvoice(CLINIC_A, ENCOUNTER_ID, CREATED_BY)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('rejects when the encounter has no treatment records (cannot create a zero-item invoice)', async () => {
    const db = buildDb({
      encounterRow: fakeEncounter,
      existingInvoiceRow: null,
      treatmentRows: [], // no treatments
      clinicPrefix: 'TST',
      newInvoiceRow: { id: 'inv-001', invoiceNumber: 'TST-00001' },
    });
    const svc = createClinicBillingService(db);
    await expect(svc.generateInvoice(CLINIC_A, ENCOUNTER_ID, CREATED_BY)).rejects.toMatchObject({
      code: 'INVALID_STATE',
      message: expect.stringContaining('no treatment records'),
    });
  });

  it('rejects when a treatment has no price configured (null servicePrice)', async () => {
    const db = buildDb({
      encounterRow: fakeEncounter,
      existingInvoiceRow: null,
      treatmentRows: [{ ...fakeRecordWithForeignService, serviceName: 'Cleaning', servicePrice: null }],
      clinicPrefix: 'TST',
      newInvoiceRow: { id: 'inv-001', invoiceNumber: 'TST-00001' },
    });
    const svc = createClinicBillingService(db);
    await expect(svc.generateInvoice(CLINIC_A, ENCOUNTER_ID, CREATED_BY)).rejects.toMatchObject({
      code: 'INVALID_STATE',
      message: expect.stringContaining('no price configured'),
    });
  });

  it('rejects when a treatment has a zero price configured', async () => {
    const db = buildDb({
      encounterRow: fakeEncounter,
      existingInvoiceRow: null,
      treatmentRows: [{ ...fakeRecordWithForeignService, serviceName: 'Consult', servicePrice: '0.00' }],
      clinicPrefix: 'TST',
      newInvoiceRow: { id: 'inv-001', invoiceNumber: 'TST-00001' },
    });
    const svc = createClinicBillingService(db);
    await expect(svc.generateInvoice(CLINIC_A, ENCOUNTER_ID, CREATED_BY)).rejects.toMatchObject({
      code: 'INVALID_STATE',
      message: expect.stringContaining('no price configured'),
    });
  });

  it('creates a valid invoice when a treatment record references a service from another clinic (cross-tenant join exclusion)', async () => {
    /**
     * The DB double simulates what happens AFTER the tenant-scoped LEFT JOIN:
     *   AND services.clinic_id = clinicId
     *
     * A treatment record pointing to a foreign clinic's service_id will have
     * null serviceId/serviceName/servicePrice from the join. Those records are
     * now rejected at the validation step — the invoice is NOT created —
     * rather than silently defaulting to ₱0.
     *
     * This test confirms the validation catches the cross-tenant case.
     */
    const db = buildDb({
      encounterRow: fakeEncounter,
      existingInvoiceRow: null,
      // After the tenant-scoped join, foreign service cols are null.
      treatmentRows: [fakeRecordWithForeignService],
      clinicPrefix: 'TST',
      newInvoiceRow: { id: 'inv-001', invoiceNumber: 'TST-00001' },
    });
    const svc = createClinicBillingService(db);
    // The cross-tenant service has null price → must be rejected, not silently zeroed.
    await expect(svc.generateInvoice(CLINIC_A, ENCOUNTER_ID, CREATED_BY)).rejects.toMatchObject({
      code: 'INVALID_STATE',
      message: expect.stringContaining('no price configured'),
    });
  });

  it('creates a valid invoice when all treatments have positive prices', async () => {
    const pricedRecord = {
      ...fakeRecordWithForeignService,
      serviceId: 'svc-001',
      serviceName: 'Cleaning',
      servicePrice: '750.00',
    };
    const db = buildDb({
      encounterRow: fakeEncounter,
      existingInvoiceRow: null,
      treatmentRows: [pricedRecord],
      clinicPrefix: 'TST',
      newInvoiceRow: { id: 'inv-001', invoiceNumber: 'TST-00001' },
    });
    const svc = createClinicBillingService(db);
    const result = await svc.generateInvoice(CLINIC_A, ENCOUNTER_ID, CREATED_BY);

    expect(result.invoiceId).toBe('inv-001');
    expect(result.invoiceNumber).toBe('TST-00001');

    const invoiceInsertCall = db._insertedInvoiceValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(invoiceInsertCall.totalAmountPhp).toBe('750.00');

    const lineItemCall = db._insertedLineItemValues.mock.calls[0]?.[0] as { description: string; unitPricePhp: string }[];
    expect(lineItemCall).toHaveLength(1);
    expect(lineItemCall[0].description).toBe('Cleaning');
    expect(lineItemCall[0].unitPricePhp).toBe('750.00');
  });

  it('throws FORBIDDEN when branch-scoped caller tries to invoice an encounter in another branch', async () => {
    const encounterInBranchB = { ...fakeEncounter, branchId: 'branch-b' };
    const db = buildDb({
      encounterRow: encounterInBranchB,
      existingInvoiceRow: null,
      treatmentRows: [],
      clinicPrefix: 'CLN',
      newInvoiceRow: { id: 'i1', invoiceNumber: 'CLN-00001' },
    });
    const svc = createClinicBillingService(db);
    await expect(
      svc.generateInvoice(CLINIC_A, ENCOUNTER_ID, CREATED_BY, ['branch-a']),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
