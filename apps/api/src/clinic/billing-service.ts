import { and, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import {
  auditEvents,
  branches,
  clinics,
  encounters,
  invoiceLineItems,
  invoicePayments,
  invoices,
  patients,
  services,
  treatmentRecords,
} from '@dentra/db/schema';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class BillingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'BillingError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmountPhp: string;
  issuedAt: Date | null;
  paidAt: Date | null;
  patient: { id: string; firstName: string; lastName: string; patientNumber: string };
  encounterId: string | null;
  createdAt: Date;
};

export type InvoiceDetail = InvoiceListItem & {
  lineItems: Array<{
    id: string;
    description: string;
    unitPricePhp: string;
    quantity: number;
    totalPhp: string;
    toothRef: string | null;
    serviceId: string | null;
  }>;
  payment: {
    id: string;
    amountPhp: string;
    paymentMethod: string;
    paymentDate: string;
  } | null;
  clinic: { name: string; prefix: string; address: string | null; city: string | null; phone: string | null; logoUrl: string | null };
};

export type UnbilledEncounterItem = {
  id: string;
  date: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientNumber: string;
  status: string;
  chiefComplaint: string | null;
  treatmentCount: number;
  branchId: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build invoice number: {PREFIX}INV{000001}
 *
 * Must be called INSIDE a transaction that holds a row-level lock on the
 * clinic row (SELECT … FOR UPDATE) so that concurrent invoice creation
 * cannot allocate the same sequence number.
 */
async function buildInvoiceNumber(db: DB, clinicId: string): Promise<string> {
  // Lock the clinic row for the duration of the transaction; this serialises
  // concurrent generateInvoice calls for the same clinic.
  const [clinic] = await db.execute<{ prefix: string }>(
    sql`SELECT prefix FROM clinics WHERE id = ${clinicId} FOR UPDATE`,
  );

  if (!clinic) throw new BillingError('NOT_FOUND', 'Clinic not found');

  const [{ total }] = await db
    .select({ total: count() })
    .from(invoices)
    .where(eq(invoices.clinicId, clinicId));

  const seq = (total + 1).toString().padStart(6, '0');
  return `${clinic.prefix}INV${seq}`;
}

// ---------------------------------------------------------------------------
// Service: list services with pricing
// ---------------------------------------------------------------------------

export type ServiceListItem = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: string;
  pricePhp: string | null;
  isActive: string;
};

export interface ClinicServiceListService {
  listServices(clinicId: string): Promise<ServiceListItem[]>;
  updateServicePrice(clinicId: string, serviceId: string, pricePhp: string | null): Promise<void>;
}

export function createClinicServiceListService(db: DB): ClinicServiceListService {
  return {
    async listServices(clinicId) {
      return db
        .select({
          id: services.id,
          name: services.name,
          description: services.description,
          durationMinutes: services.durationMinutes,
          pricePhp: services.pricePhp,
          isActive: services.isActive,
        })
        .from(services)
        .where(eq(services.clinicId, clinicId))
        .orderBy(services.name);
    },

    async updateServicePrice(clinicId, serviceId, pricePhp) {
      const [existing] = await db
        .select({ id: services.id })
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.clinicId, clinicId)))
        .limit(1);

      if (!existing) throw new BillingError('NOT_FOUND', 'Service not found');

      await db
        .update(services)
        .set({ pricePhp: pricePhp ?? null })
        .where(and(eq(services.id, serviceId), eq(services.clinicId, clinicId)));
    },
  };
}

// ---------------------------------------------------------------------------
// Service: invoices
// ---------------------------------------------------------------------------

export interface ClinicBillingService {
  listInvoices(
    clinicId: string,
    filters: { search?: string; status?: string; dateFrom?: string; dateTo?: string; page: number; pageSize: number; callerBranchIds?: string[] | null },
  ): Promise<{ data: InvoiceListItem[]; total: number; page: number; pageSize: number }>;

  /**
   * Returns null when invoice does not exist OR caller is branch-scoped and the
   * invoice belongs to a different branch.
   */
  getInvoice(clinicId: string, invoiceId: string, callerBranchIds?: string[] | null): Promise<InvoiceDetail | null>;

  /**
   * Generate an invoice from a finalized encounter.
   * The branch is derived from the encounter server-side (not from the caller).
   * callerBranchIds enforces branch-level access: the encounter must be in one of
   * the permitted branches. null = clinic-wide (no restriction).
   */
  generateInvoice(
    clinicId: string,
    encounterId: string,
    createdBy: string,
    callerBranchIds?: string[] | null,
  ): Promise<{ invoiceId: string; invoiceNumber: string }>;

  recordPayment(
    clinicId: string,
    invoiceId: string,
    data: { amountPhp: string; paymentMethod: string; paymentDate: string; notes?: string; recordedBy: string; callerBranchIds?: string[] | null },
  ): Promise<void>;

  /** Branch-scoped: null means clinic-wide. */
  getTodayEarnings(clinicId: string, callerBranchIds?: string[] | null): Promise<{ totalPhp: string; invoiceCount: number }>;

  /** Branch-scoped: null means clinic-wide. */
  listUnbilledEncounters(clinicId: string, callerBranchIds?: string[] | null): Promise<UnbilledEncounterItem[]>;
}

export function createClinicBillingService(db: DB): ClinicBillingService {
  return {
    // ------------------------------------------------------------------
    // listInvoices
    // ------------------------------------------------------------------
    async listInvoices(clinicId, { search, status, dateFrom, dateTo, page, pageSize, callerBranchIds }) {
      const offset = (page - 1) * pageSize;

      const conditions = [eq(invoices.clinicId, clinicId)];
      if (callerBranchIds && callerBranchIds.length > 0) conditions.push(inArray(invoices.branchId, callerBranchIds));

      if (status) {
        conditions.push(eq(invoices.status, status as 'pending' | 'paid' | 'voided'));
      }
      if (dateFrom) {
        conditions.push(gte(invoices.issuedAt, new Date(dateFrom)));
      }
      if (dateTo) {
        // dateTo is inclusive — add 1 day
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        conditions.push(lt(invoices.issuedAt, end));
      }
      if (search) {
        const term = `%${search}%`;
        conditions.push(
          or(
            ilike(patients.firstName, term),
            ilike(patients.lastName, term),
            ilike(invoices.invoiceNumber, term),
          )!,
        );
      }

      const where = and(...conditions);

      const [{ total }] = await db
        .select({ total: count() })
        .from(invoices)
        .innerJoin(patients, eq(invoices.patientId, patients.id))
        .where(where);

      const rows = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          totalAmountPhp: invoices.totalAmountPhp,
          issuedAt: invoices.issuedAt,
          paidAt: invoices.paidAt,
          createdAt: invoices.createdAt,
          encounterId: invoices.encounterId,
          patientId: patients.id,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientNumber: patients.patientNumber,
        })
        .from(invoices)
        .innerJoin(patients, eq(invoices.patientId, patients.id))
        .where(where)
        .orderBy(desc(invoices.createdAt))
        .limit(pageSize)
        .offset(offset);

      const data: InvoiceListItem[] = rows.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        status: r.status,
        totalAmountPhp: r.totalAmountPhp,
        issuedAt: r.issuedAt,
        paidAt: r.paidAt,
        createdAt: r.createdAt,
        encounterId: r.encounterId,
        patient: {
          id: r.patientId,
          firstName: r.patientFirstName,
          lastName: r.patientLastName,
          patientNumber: r.patientNumber,
        },
      }));

      return { data, total, page, pageSize };
    },

    // ------------------------------------------------------------------
    // getInvoice
    // ------------------------------------------------------------------
    async getInvoice(clinicId, invoiceId, callerBranchIds) {
      const [row] = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          totalAmountPhp: invoices.totalAmountPhp,
          issuedAt: invoices.issuedAt,
          paidAt: invoices.paidAt,
          createdAt: invoices.createdAt,
          encounterId: invoices.encounterId,
          branchId: invoices.branchId,
          patientId: patients.id,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientNumber: patients.patientNumber,
          clinicName: clinics.name,
          clinicPrefix: clinics.prefix,
          clinicAddress: clinics.address,
          clinicCity: clinics.city,
          clinicPhone: clinics.phone,
          clinicLogoUrl: clinics.logoUrl,
        })
        .from(invoices)
        .innerJoin(patients, eq(invoices.patientId, patients.id))
        .innerJoin(clinics, eq(invoices.clinicId, clinics.id))
        .where(and(eq(invoices.id, invoiceId), eq(invoices.clinicId, clinicId)))
        .limit(1);

      if (!row) return null;
      // Branch-scope check: return null (→ 404) if caller is restricted to branches that don't include this invoice's branch.
      if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(row.branchId)) return null;

      const lineItemRows = await db
        .select({
          id: invoiceLineItems.id,
          description: invoiceLineItems.description,
          unitPricePhp: invoiceLineItems.unitPricePhp,
          quantity: invoiceLineItems.quantity,
          totalPhp: invoiceLineItems.totalPhp,
          toothRef: invoiceLineItems.toothRef,
          serviceId: invoiceLineItems.serviceId,
        })
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, invoiceId))
        .orderBy(invoiceLineItems.createdAt);

      const [paymentRow] = await db
        .select({
          id: invoicePayments.id,
          amountPhp: invoicePayments.amountPhp,
          paymentMethod: invoicePayments.paymentMethod,
          paymentDate: invoicePayments.paymentDate,
        })
        .from(invoicePayments)
        .where(eq(invoicePayments.invoiceId, invoiceId))
        .limit(1);

      return {
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        status: row.status,
        totalAmountPhp: row.totalAmountPhp,
        issuedAt: row.issuedAt,
        paidAt: row.paidAt,
        createdAt: row.createdAt,
        encounterId: row.encounterId,
        patient: {
          id: row.patientId,
          firstName: row.patientFirstName,
          lastName: row.patientLastName,
          patientNumber: row.patientNumber,
        },
        clinic: {
          name: row.clinicName,
          prefix: row.clinicPrefix,
          address: row.clinicAddress,
          city: row.clinicCity,
          phone: row.clinicPhone,
          logoUrl: row.clinicLogoUrl,
        },
        lineItems: lineItemRows,
        payment: paymentRow ?? null,
      };
    },

    // ------------------------------------------------------------------
    // generateInvoice
    // ------------------------------------------------------------------
    async generateInvoice(clinicId, encounterId, createdBy, callerBranchIds) {
      // Verify encounter belongs to clinic
      const [encounter] = await db
        .select({
          id: encounters.id,
          patientId: encounters.patientId,
          status: encounters.status,
          branchId: encounters.branchId,
        })
        .from(encounters)
        .where(and(eq(encounters.id, encounterId), eq(encounters.clinicId, clinicId)))
        .limit(1);

      if (!encounter) throw new BillingError('NOT_FOUND', 'Encounter not found');
      if (encounter.status !== 'final') throw new BillingError('INVALID_STATE', 'Encounter must be finalized before invoicing');
      // Branch-scope: caller restricted to specific branches cannot generate invoices for other branches.
      if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(encounter.branchId)) {
        throw new BillingError('FORBIDDEN', 'You do not have access to this encounter');
      }

      // Check no existing invoice for this encounter
      const [existing] = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(and(eq(invoices.encounterId, encounterId), eq(invoices.clinicId, clinicId)))
        .limit(1);

      if (existing) throw new BillingError('CONFLICT', 'An invoice already exists for this encounter');

      // Fetch treatment records with service names and prices
      const records = await db
        .select({
          id: treatmentRecords.id,
          toothRef: treatmentRecords.toothRef,
          notes: treatmentRecords.notes,
          serviceId: services.id,
          serviceName: services.name,
          servicePrice: services.pricePhp,
        })
        .from(treatmentRecords)
        .leftJoin(services, and(eq(treatmentRecords.serviceId, services.id), eq(services.clinicId, clinicId)))
        .where(and(eq(treatmentRecords.encounterId, encounterId), eq(treatmentRecords.clinicId, clinicId)));

      // Validate: must have at least one treatment record to invoice.
      if (records.length === 0) {
        throw new BillingError(
          'INVALID_STATE',
          'Cannot generate an invoice for an encounter with no treatment records',
        );
      }

      // Validate: every treatment record must have a positive price configured.
      // Prevent zero-value official receipts; staff must set prices before invoicing.
      const unpricedServices = records.filter((r) => {
        const price = parseFloat(r.servicePrice ?? '0');
        return !isFinite(price) || price <= 0;
      });
      if (unpricedServices.length > 0) {
        const names = unpricedServices.map((r) => r.serviceName ?? 'Unknown service').join(', ');
        throw new BillingError(
          'INVALID_STATE',
          `Cannot generate an invoice: the following services have no price configured: ${names}. Set prices in Settings → Service Pricing before invoicing.`,
        );
      }

      // Build line items and total
      const lineItemsToInsert = records.map((r) => ({
        invoiceId: '', // filled after insert
        clinicId,
        serviceId: r.serviceId ?? null,
        description: r.serviceName ?? 'Service',
        unitPricePhp: r.servicePrice!,
        quantity: 1,
        totalPhp: r.servicePrice!,
        toothRef: r.toothRef ?? null,
        notes: r.notes ?? null,
      }));

      const totalAmountPhp = lineItemsToInsert
        .reduce((sum, li) => sum + parseFloat(li.totalPhp), 0)
        .toFixed(2);

      const now = new Date();

      return await db.transaction(async (tx) => {
        // buildInvoiceNumber does a SELECT … FOR UPDATE inside the same tx,
        // serialising concurrent invoice creation for this clinic.
        const invoiceNumber = await buildInvoiceNumber(tx as unknown as DB, clinicId);

        // Guard inside the transaction: re-check for an existing invoice now
        // that we hold the clinic row lock, preventing a race window.
        const [existingInTx] = await tx
          .select({ id: invoices.id })
          .from(invoices)
          .where(and(eq(invoices.encounterId, encounterId), eq(invoices.clinicId, clinicId)))
          .limit(1);
        if (existingInTx) throw new BillingError('CONFLICT', 'An invoice already exists for this encounter');

        const [inv] = await tx
          .insert(invoices)
          .values({
            clinicId,
            branchId: encounter.branchId,
            patientId: encounter.patientId,
            encounterId,
            invoiceNumber,
            status: 'pending',
            totalAmountPhp,
            issuedAt: now,
            createdBy,
          })
          .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });

        if (lineItemsToInsert.length > 0) {
          await tx.insert(invoiceLineItems).values(
            lineItemsToInsert.map((li) => ({ ...li, invoiceId: inv.id })),
          );
        }

        // Audit event
        await tx.insert(auditEvents).values({
          clinicId,
          actorId: createdBy,
          action: 'invoice.created',
          entityType: 'invoice',
          entityId: inv.id,
          metadata: JSON.stringify({ invoiceNumber: inv.invoiceNumber, totalAmountPhp }),
        });

        return { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber };
      });
    },

    // ------------------------------------------------------------------
    // recordPayment
    // ------------------------------------------------------------------
    async recordPayment(clinicId, invoiceId, { amountPhp, paymentMethod, paymentDate, notes, recordedBy, callerBranchIds }) {
      const [inv] = await db
        .select({ id: invoices.id, status: invoices.status, totalAmountPhp: invoices.totalAmountPhp, branchId: invoices.branchId })
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.clinicId, clinicId)))
        .limit(1);

      if (!inv) throw new BillingError('NOT_FOUND', 'Invoice not found');
      if (inv.status !== 'pending') throw new BillingError('INVALID_STATE', 'Only pending invoices can be paid');
      if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(inv.branchId)) {
        throw new BillingError('FORBIDDEN', 'You do not have access to this invoice');
      }

      // MVP 1 — single full payment only; amount must equal invoice total (within ₱0.01 tolerance)
      const invoiceTotal = parseFloat(inv.totalAmountPhp);
      const paymentAmount = parseFloat(amountPhp);

      // Guard: zero-value invoices should never reach the payment stage, but defend
      // in depth — a ₱0.00 payment is never valid (would produce a fake receipt).
      if (invoiceTotal <= 0 || paymentAmount <= 0) {
        throw new BillingError('INVALID_AMOUNT', 'Payment amount must be greater than ₱0.00');
      }

      if (Math.abs(invoiceTotal - paymentAmount) > 0.01) {
        throw new BillingError(
          'INVALID_AMOUNT',
          `Payment amount (₱${paymentAmount.toFixed(2)}) must equal invoice total (₱${invoiceTotal.toFixed(2)}). Partial payments are not supported in this version.`,
        );
      }

      await db.transaction(async (tx) => {
        // Lock the invoice row to serialise concurrent payment attempts.
        const [lockedInv] = await tx.execute<{ id: string; status: string; branch_id: string }>(
          sql`SELECT id, status, branch_id FROM invoices WHERE id = ${invoiceId} AND clinic_id = ${clinicId} FOR UPDATE`,
        );
        if (!lockedInv) throw new BillingError('NOT_FOUND', 'Invoice not found');
        if (lockedInv.status !== 'pending') throw new BillingError('INVALID_STATE', 'Only pending invoices can be paid');
        if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(lockedInv.branch_id)) {
          throw new BillingError('FORBIDDEN', 'You do not have access to this invoice');
        }

        await tx.insert(invoicePayments).values({
          invoiceId,
          clinicId,
          amountPhp,
          paymentMethod: paymentMethod as 'cash' | 'gcash' | 'card' | 'bank_transfer' | 'other',
          paymentDate,
          recordedBy,
          notes: notes ?? null,
        });

        await tx
          .update(invoices)
          .set({ status: 'paid', paidAt: new Date() })
          .where(and(eq(invoices.id, invoiceId), eq(invoices.status, 'pending')));

        await tx.insert(auditEvents).values({
          clinicId,
          actorId: recordedBy,
          action: 'payment.recorded',
          entityType: 'invoice',
          entityId: invoiceId,
          metadata: JSON.stringify({ amountPhp, paymentMethod, paymentDate }),
        });
      });
    },

    // ------------------------------------------------------------------
    // getTodayEarnings
    // ------------------------------------------------------------------
    async getTodayEarnings(clinicId, callerBranchIds) {
      // Filter by the user-recorded payment_date (YYYY-MM-DD string), not by
      // created_at, so that historically-dated payments don't inflate today's
      // collections and payments dated today are always included.
      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

      const conditions = [
        eq(invoicePayments.clinicId, clinicId),
        eq(invoicePayments.paymentDate, todayStr),
      ];
      // Branch-scoped callers see only their branch's collections.
      // We join invoices to check branchId; invoicePayments.invoiceId → invoices.id
      const rows = (callerBranchIds && callerBranchIds.length > 0)
        ? await db
          .select({
            total: sql<string>`COALESCE(SUM(${invoicePayments.amountPhp}), 0)`,
            cnt: count(),
          })
          .from(invoicePayments)
          .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
          .where(and(...conditions, inArray(invoices.branchId, callerBranchIds)))
        : await db
          .select({
            total: sql<string>`COALESCE(SUM(${invoicePayments.amountPhp}), 0)`,
            cnt: count(),
          })
          .from(invoicePayments)
          .where(and(...conditions));

      return {
        totalPhp: parseFloat(rows[0]?.total ?? '0').toFixed(2),
        invoiceCount: rows[0]?.cnt ?? 0,
      };
    },

    // ------------------------------------------------------------------
    // listUnbilledEncounters — finalized encounters without an invoice
    // ------------------------------------------------------------------
    async listUnbilledEncounters(clinicId, callerBranchIds) {
      const baseConditions = [
        eq(encounters.clinicId, clinicId),
        eq(encounters.status, 'final'),
        isNull(
          db
            .select({ id: invoices.id })
            .from(invoices)
            .where(eq(invoices.encounterId, encounters.id))
            .limit(1),
        ),
      ];
      if (callerBranchIds && callerBranchIds.length > 0) baseConditions.push(inArray(encounters.branchId, callerBranchIds));

      const rows = await db
        .select({
          id: encounters.id,
          date: encounters.date,
          patientId: patients.id,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientNumber: patients.patientNumber,
          status: encounters.status,
          chiefComplaint: encounters.chiefComplaint,
          branchId: encounters.branchId,
          treatmentCount: sql<number>`CAST(COUNT(${treatmentRecords.id}) AS int)`,
        })
        .from(encounters)
        .innerJoin(patients, eq(encounters.patientId, patients.id))
        .leftJoin(treatmentRecords, eq(treatmentRecords.encounterId, encounters.id))
        .where(and(...baseConditions))
        .groupBy(
          encounters.id,
          patients.id,
          patients.firstName,
          patients.lastName,
          patients.patientNumber,
        )
        .orderBy(desc(encounters.date));

      return rows.map((r) => ({
        id: r.id,
        date: typeof r.date === 'string' ? r.date : String(r.date).slice(0, 10),
        patientId: r.patientId,
        patientFirstName: r.patientFirstName,
        patientLastName: r.patientLastName,
        patientNumber: r.patientNumber,
        status: r.status,
        chiefComplaint: r.chiefComplaint,
        treatmentCount: r.treatmentCount,
        branchId: r.branchId,
      }));
    },
  };
}
