import { and, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';
import { getEffectiveServicePrice } from './service-catalog-service.js';
import type { IntegrationService } from '../integrations/service.js';
import {
  branches,
  clinics,
  encounters,
  invoiceLineItems,
  invoicePayments,
  invoiceTransactions,
  invoices,
  onlinePayments,
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
  balancePhp?: string;
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
  payments?: Array<{ id: string; amountPhp: string; paymentMethod: string; paymentDate: string; recordedBy: string | null }>;
  transactions?: Array<{ id: string; type: string; amountPhp: string; paymentMethod: string | null; transactionDate: string; reason: string }>;
  subtotalPhp?: string;
  discountAmountPhp?: string;
  discountReason?: string | null;
  balancePhp?: string;
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
    options?: { discountAmountPhp?: string; discountReason?: string; treatmentPlanId?: string },
  ): Promise<{ invoiceId: string; invoiceNumber: string }>;

  recordPayment(
    clinicId: string,
    invoiceId: string,
    data: { amountPhp: string; paymentMethod: string; paymentDate: string; notes?: string; recordedBy: string; callerBranchIds?: string[] | null },
  ): Promise<void>;

  recordRefund?: (clinicId: string, invoiceId: string, data: { amountPhp: string; paymentMethod?: string; transactionDate: string; reason: string; recordedBy: string; callerBranchIds?: string[] | null }) => Promise<void>;
  recordAdjustment?: (clinicId: string, invoiceId: string, data: { amountPhp: string; transactionDate: string; reason: string; recordedBy: string; callerBranchIds?: string[] | null }) => Promise<void>;

  /** Branch-scoped: null means clinic-wide. */
  getTodayEarnings(clinicId: string, callerBranchIds?: string[] | null): Promise<{ totalPhp: string; invoiceCount: number }>;

  /** Branch-scoped: null means clinic-wide. */
  listUnbilledEncounters(clinicId: string, callerBranchIds?: string[] | null): Promise<UnbilledEncounterItem[]>;
}

export function createClinicBillingService(db: DB, integrations?: IntegrationService): ClinicBillingService {
  return {
    // ------------------------------------------------------------------
    // listInvoices
    // ------------------------------------------------------------------
    async listInvoices(clinicId, { search, status, dateFrom, dateTo, page, pageSize, callerBranchIds }) {
      const offset = (page - 1) * pageSize;

      const conditions = [eq(invoices.clinicId, clinicId)];
      if (callerBranchIds && callerBranchIds.length > 0) conditions.push(inArray(invoices.branchId, callerBranchIds));

      if (status) {
        conditions.push(eq(invoices.status, status as 'pending' | 'partially_paid' | 'paid' | 'refunded' | 'voided'));
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
          subtotalPhp: invoices.subtotalPhp,
          discountAmountPhp: invoices.discountAmountPhp,
          discountReason: invoices.discountReason,
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
          subtotalPhp: invoices.subtotalPhp,
          discountAmountPhp: invoices.discountAmountPhp,
          discountReason: invoices.discountReason,
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

      const paymentRows = await db
        .select({ id: invoicePayments.id, amountPhp: invoicePayments.amountPhp, paymentMethod: invoicePayments.paymentMethod, paymentDate: invoicePayments.paymentDate, recordedBy: invoicePayments.recordedBy })
        .from(invoicePayments)
        .where(and(eq(invoicePayments.invoiceId, invoiceId), eq(invoicePayments.clinicId, clinicId)))
        .orderBy(invoicePayments.createdAt);
      const transactionRows = await db
        .select({ id: invoiceTransactions.id, type: invoiceTransactions.type, amountPhp: invoiceTransactions.amountPhp, paymentMethod: invoiceTransactions.paymentMethod, transactionDate: invoiceTransactions.transactionDate, reason: invoiceTransactions.reason })
        .from(invoiceTransactions)
        .where(and(eq(invoiceTransactions.invoiceId, invoiceId), eq(invoiceTransactions.clinicId, clinicId)))
        .orderBy(invoiceTransactions.createdAt);
      const paidTotal = paymentRows.reduce((sum, item) => sum + Number(item.amountPhp), 0);
      const adjustmentTotal = transactionRows.filter((item) => item.type === 'adjustment').reduce((sum, item) => sum + Number(item.amountPhp), 0);
      const refundTotal = transactionRows.filter((item) => item.type === 'refund').reduce((sum, item) => sum + Number(item.amountPhp), 0);
      const balancePhp = Math.max(0, Number(row.totalAmountPhp) - paidTotal - adjustmentTotal + refundTotal).toFixed(2);

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
        payments: paymentRows,
        transactions: transactionRows,
        subtotalPhp: row.subtotalPhp ?? row.totalAmountPhp,
        discountAmountPhp: row.discountAmountPhp ?? '0.00',
        discountReason: row.discountReason,
        balancePhp,
      };
    },

    // ------------------------------------------------------------------
    // generateInvoice
    // ------------------------------------------------------------------
    async generateInvoice(clinicId, encounterId, createdBy, callerBranchIds, options) {
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

      const pricedRecords = await Promise.all(records.map(async (record) => ({
        ...record,
        servicePrice: record.serviceId
          ? (await getEffectiveServicePrice(db, clinicId, record.serviceId, encounter.branchId, new Date(), record.servicePrice)).pricePhp
          : null,
      })));

      // Validate: must have at least one treatment record to invoice.
      if (pricedRecords.length === 0) {
        throw new BillingError(
          'INVALID_STATE',
          'Cannot generate an invoice for an encounter with no treatment records',
        );
      }

      // Validate: every treatment record must have a positive price configured.
      // Prevent zero-value official receipts; staff must set prices before invoicing.
      const unpricedServices = pricedRecords.filter((r) => {
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
      const lineItemsToInsert = pricedRecords.map((r) => ({
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

      const subtotalPhp = lineItemsToInsert
        .reduce((sum, li) => sum + parseFloat(li.totalPhp), 0)
        .toFixed(2);
      const discountAmountPhp = options?.discountAmountPhp ?? '0.00';
      const discount = parseFloat(discountAmountPhp);
      const subtotal = parseFloat(subtotalPhp);
      if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
        throw new BillingError('INVALID_DISCOUNT', 'Discount must be between ₱0.00 and the invoice subtotal');
      }
      if (discount > 0 && !options?.discountReason?.trim()) {
        throw new BillingError('DISCOUNT_REASON_REQUIRED', 'A reason is required when applying a discount');
      }
      const totalAmountPhp = (subtotal - discount).toFixed(2);

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
            treatmentPlanId: options?.treatmentPlanId ?? null,
            invoiceNumber,
            status: 'pending',
            totalAmountPhp,
            subtotalPhp,
            discountAmountPhp: discount.toFixed(2),
            discountReason: options?.discountReason?.trim() || null,
            discountAppliedBy: discount > 0 ? createdBy : null,
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
        await writeAudit(tx, {
          clinicId,
          actorId: createdBy,
          action: AuditAction.INVOICE_CREATED,
          entityType: 'invoice',
          entityId: inv.id,
          metadata: JSON.stringify({ invoiceNumber: inv.invoiceNumber, totalAmountPhp, discountAmountPhp: discount.toFixed(2) }),
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
      if (!['pending', 'partially_paid'].includes(inv.status)) throw new BillingError('INVALID_STATE', 'Only open invoices can be paid');
      if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(inv.branchId)) {
        throw new BillingError('FORBIDDEN', 'You do not have access to this invoice');
      }

      const invoiceTotal = parseFloat(inv.totalAmountPhp);
      const paymentAmount = parseFloat(amountPhp);

      // Guard: zero-value invoices should never reach the payment stage, but defend
      // in depth — a ₱0.00 payment is never valid (would produce a fake receipt).
      if (invoiceTotal <= 0 || paymentAmount <= 0) {
        throw new BillingError('INVALID_AMOUNT', 'Payment amount must be greater than ₱0.00');
      }

      const becamePaid = await db.transaction(async (tx) => {
        // Lock the invoice row to serialise concurrent payment attempts.
        const [lockedInv] = await tx.execute<{ id: string; status: string; branch_id: string }>(
          sql`SELECT id, status, branch_id FROM invoices WHERE id = ${invoiceId} AND clinic_id = ${clinicId} FOR UPDATE`,
        );
        if (!lockedInv) throw new BillingError('NOT_FOUND', 'Invoice not found');
        if (!['pending', 'partially_paid'].includes(lockedInv.status)) throw new BillingError('INVALID_STATE', 'Only open invoices can be paid');
        if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(lockedInv.branch_id)) {
          throw new BillingError('FORBIDDEN', 'You do not have access to this invoice');
        }

        const priorPayments = await tx.select({ amountPhp: invoicePayments.amountPhp }).from(invoicePayments).where(and(eq(invoicePayments.invoiceId, invoiceId), eq(invoicePayments.clinicId, clinicId)));
        const priorTransactions = await tx.select({ type: invoiceTransactions.type, amountPhp: invoiceTransactions.amountPhp }).from(invoiceTransactions).where(and(eq(invoiceTransactions.invoiceId, invoiceId), eq(invoiceTransactions.clinicId, clinicId)));
        const paid = priorPayments.reduce((sum, row) => sum + Number(row.amountPhp), 0);
        const credits = priorTransactions.reduce((sum, row) => sum + (row.type === 'adjustment' ? Number(row.amountPhp) : 0), 0);
        const refunds = priorTransactions.reduce((sum, row) => sum + (row.type === 'refund' ? Number(row.amountPhp) : 0), 0);
        const balance = invoiceTotal - paid - credits + refunds;
        if (paymentAmount > balance + 0.01) throw new BillingError('INVALID_AMOUNT', `Payment exceeds the remaining balance of ₱${Math.max(0, balance).toFixed(2)}`);

        await tx.insert(invoicePayments).values({
          invoiceId,
          clinicId,
          amountPhp,
          paymentMethod: paymentMethod as 'cash' | 'gcash' | 'card' | 'bank_transfer' | 'other',
          paymentDate,
          recordedBy,
          notes: notes ?? null,
        });

        const nextBalance = balance - paymentAmount;
        const paidInFull = nextBalance <= 0.01;
        await tx.update(invoices).set({ status: paidInFull ? 'paid' : 'partially_paid', paidAt: paidInFull ? new Date() : null }).where(eq(invoices.id, invoiceId));

        await writeAudit(tx, {
          clinicId,
          actorId: recordedBy,
          action: AuditAction.PAYMENT_RECORDED,
          entityType: 'invoice',
          entityId: invoiceId,
          metadata: JSON.stringify({ amountPhp, paymentMethod, paymentDate }),
        });
        return paidInFull;
      });
      if (becamePaid) integrations?.dispatchEvent(clinicId, 'invoice.paid', { invoiceId, amountPhp, paymentMethod });
    },

    async recordRefund(clinicId, invoiceId, { amountPhp, paymentMethod, transactionDate, reason, recordedBy, callerBranchIds }) {
      const fullyRefunded = await db.transaction(async (tx) => {
        const [invoice] = await tx.select({ id: invoices.id, totalAmountPhp: invoices.totalAmountPhp, branchId: invoices.branchId, status: invoices.status }).from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.clinicId, clinicId))).limit(1).for('update');
        if (!invoice) throw new BillingError('NOT_FOUND', 'Invoice not found');
        if (invoice.status === 'voided') throw new BillingError('INVALID_STATE', 'Voided invoices cannot be refunded');
        if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(invoice.branchId)) throw new BillingError('FORBIDDEN', 'You do not have access to this invoice');
        const amount = Number(amountPhp);
        if (!Number.isFinite(amount) || amount <= 0) throw new BillingError('INVALID_AMOUNT', 'Refund amount must be greater than ₱0.00');
        const payments = await tx.select({ amountPhp: invoicePayments.amountPhp }).from(invoicePayments).where(eq(invoicePayments.invoiceId, invoiceId));
        const refunds = await tx.select({ amountPhp: invoiceTransactions.amountPhp }).from(invoiceTransactions).where(and(eq(invoiceTransactions.invoiceId, invoiceId), eq(invoiceTransactions.type, 'refund')));
        const refundable = payments.reduce((sum, row) => sum + Number(row.amountPhp), 0) - refunds.reduce((sum, row) => sum + Number(row.amountPhp), 0);
        if (amount > refundable + 0.01) throw new BillingError('INVALID_AMOUNT', `Refund exceeds refundable payments of ₱${Math.max(0, refundable).toFixed(2)}`);
        await tx.insert(invoiceTransactions).values({ invoiceId, clinicId, type: 'refund', amountPhp, paymentMethod: (paymentMethod ?? null) as 'cash' | 'gcash' | 'card' | 'bank_transfer' | 'other' | null, transactionDate, reason: reason.trim(), recordedBy });
        const totalRefunded = refunds.reduce((sum, row) => sum + Number(row.amountPhp), 0) + amount;
        const paidInFull = totalRefunded >= payments.reduce((sum, row) => sum + Number(row.amountPhp), 0) - 0.01;
        await tx.update(invoices).set({ status: paidInFull ? 'refunded' : 'partially_paid' }).where(eq(invoices.id, invoiceId));
        // Reconcile against online payments so the payment-link status page reflects clinic-recorded
        // refunds; this only marks the platform's own record, it never accepts a client-reported status.
        if (paidInFull) {
          await tx.update(onlinePayments).set({ status: 'refunded', updatedAt: new Date() }).where(and(eq(onlinePayments.invoiceId, invoiceId), eq(onlinePayments.clinicId, clinicId), eq(onlinePayments.status, 'succeeded')));
        }
        await writeAudit(tx, { clinicId, actorId: recordedBy, action: AuditAction.INVOICE_REFUNDED, entityType: 'invoice', entityId: invoiceId, metadata: JSON.stringify({ amountPhp, transactionDate }), });
        return paidInFull;
      });
      integrations?.dispatchEvent(clinicId, 'invoice.refunded', { invoiceId, amountPhp, fullyRefunded });
    },

    async recordAdjustment(clinicId, invoiceId, { amountPhp, transactionDate, reason, recordedBy, callerBranchIds }) {
      await db.transaction(async (tx) => {
        const [invoice] = await tx.select({ id: invoices.id, totalAmountPhp: invoices.totalAmountPhp, branchId: invoices.branchId, status: invoices.status }).from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.clinicId, clinicId))).limit(1).for('update');
        if (!invoice) throw new BillingError('NOT_FOUND', 'Invoice not found');
        if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(invoice.branchId)) throw new BillingError('FORBIDDEN', 'You do not have access to this invoice');
        const amount = Number(amountPhp);
        if (!Number.isFinite(amount) || amount <= 0) throw new BillingError('INVALID_AMOUNT', 'Adjustment amount must be greater than ₱0.00');
        await tx.insert(invoiceTransactions).values({ invoiceId, clinicId, type: 'adjustment', amountPhp, transactionDate, reason: reason.trim(), recordedBy });
        await writeAudit(tx, { clinicId, actorId: recordedBy, action: AuditAction.INVOICE_ADJUSTED, entityType: 'invoice', entityId: invoiceId, metadata: JSON.stringify({ amountPhp, transactionDate }), });
      });
    },

    // ------------------------------------------------------------------
    // getTodayEarnings
    // ------------------------------------------------------------------
    async getTodayEarnings(clinicId, callerBranchIds) {
      // Filter by the user-recorded payment_date (YYYY-MM-DD string), not by
      // created_at, so that historically-dated payments don't inflate today's
      // collections and payments dated today are always included.
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

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
