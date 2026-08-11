/**
 * HMO / Insurance claims service.
 *
 * Manages:
 * - HMO payer catalog (clinic admin)
 * - Patient HMO memberships
 * - Claim tracker with status transitions
 * - Billing linkage: when claim → paid, inserts an invoice_payment
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import {
  hmoPayers,
  patientHmoMemberships,
  hmoClaims,
  invoices,
  invoicePayments,
  auditEvents,
  patients,
  encounters,
} from '@dentra/db/schema';
import type { HmoClaim } from '@dentra/db/schema';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class HmoServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'INVALID_TRANSITION'
      | 'ALREADY_EXISTS'
      | 'INVOICE_NOT_FOUND'
      | 'CLAIM_ALREADY_PAID',
    message: string,
  ) {
    super(message);
    this.name = 'HmoServiceError';
  }
}

// ---------------------------------------------------------------------------
// Valid status transitions
// prepared → submitted → approved | rejected → paid (from approved only)
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<string, string[]> = {
  prepared:  ['submitted'],
  submitted: ['approved', 'rejected'],
  approved:  ['paid'],
  rejected:  [],
  paid:      [],
};

function assertTransition(from: string, to: string): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new HmoServiceError(
      'INVALID_TRANSITION',
      `Cannot move claim from '${from}' to '${to}'. Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Claim number generation: HMOCLM{8-digit globally unique serial}
// Uses a global count across all clinics to satisfy the global UNIQUE index on
// claim_number. A random 4-digit suffix prevents collisions under concurrent
// inserts. If a unique conflict still occurs the INSERT will throw and the
// transaction will be retried by the caller.
// ---------------------------------------------------------------------------

async function generateClaimNumber(db: DB): Promise<string> {
  const [{ total }] = await db
    .select({ total: sql<number>`CAST(COUNT(*) AS int)` })
    .from(hmoClaims);
  // Pad to 8 digits and append 4 random digits for collision resistance
  const base = String(total + 1).padStart(8, '0');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `HMOCLM${base}${rand}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PayerInput = {
  name: string;
  accreditationNumber?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
};

export type MembershipInput = {
  hmoPayer?: string;           // hmo_payer.id
  payerNameSnapshot: string;   // name (required; snapshot even if no payer FK)
  cardNumber: string;
  memberName?: string;
  coverageType: 'dental' | 'medical' | 'combined';
  effectiveDate?: string;
  expiryDate?: string;
  notes?: string;
};

export type ClaimInput = {
  patientId: string;
  hmoPayer?: string;
  payerNameSnapshot: string;
  membershipId?: string;
  invoiceId?: string;
  encounterId?: string;
  loaCode?: string;
  claimAmountPhp: string;
  notes?: string;
};

export type ClaimStatusUpdate =
  | { to: 'submitted' }
  | { to: 'approved'; approvedAmountPhp: string }
  | { to: 'rejected'; rejectionReason: string }
  | { to: 'paid'; notes?: string };

export type ClaimListItem = {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  payerNameSnapshot: string;
  invoiceId: string | null;
  encounterId: string | null;
  claimAmountPhp: string;
  approvedAmountPhp: string | null;
  loaCode: string | null;
  status: string;
  paidAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
};

export type ClaimDetail = ClaimListItem & {
  hmoPayer: string | null;
  membershipId: string | null;
  rejectionReason: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  notes: string | null;
  preparedBy: string | null;
};

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface HmoService {
  // --- Payer catalog ---
  listPayers(clinicId: string): Promise<typeof hmoPayers.$inferSelect[]>;
  createPayer(clinicId: string, input: PayerInput, actorId: string): Promise<typeof hmoPayers.$inferSelect>;
  updatePayer(clinicId: string, payerId: string, input: Partial<PayerInput & { isActive: string }>, actorId: string): Promise<void>;
  getPayer(clinicId: string, payerId: string): Promise<typeof hmoPayers.$inferSelect | null>;

  // --- Patient memberships ---
  listMemberships(clinicId: string, patientId: string): Promise<typeof patientHmoMemberships.$inferSelect[]>;
  upsertMembership(clinicId: string, patientId: string, input: MembershipInput): Promise<typeof patientHmoMemberships.$inferSelect>;
  deleteMembership(clinicId: string, patientId: string, membershipId: string): Promise<void>;

  // --- Claims ---
  listClaims(clinicId: string, opts: { status?: string; page: number; pageSize: number }): Promise<{ data: ClaimListItem[]; total: number }>;
  getClaim(clinicId: string, claimId: string): Promise<ClaimDetail | null>;
  createClaim(clinicId: string, input: ClaimInput, actorId: string): Promise<HmoClaim>;
  updateClaimStatus(clinicId: string, claimId: string, update: ClaimStatusUpdate, actorId: string): Promise<void>;

  // --- Claim data for PDF ---
  getClaimPdfData(clinicId: string, claimId: string): Promise<Record<string, unknown> | null>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createHmoService(db: DB): HmoService {
  return {
    // ── Payer catalog ────────────────────────────────────────────────────

    async listPayers(clinicId) {
      return db.select().from(hmoPayers)
        .where(eq(hmoPayers.clinicId, clinicId))
        .orderBy(hmoPayers.name);
    },

    async getPayer(clinicId, payerId) {
      const [row] = await db.select().from(hmoPayers)
        .where(and(eq(hmoPayers.id, payerId), eq(hmoPayers.clinicId, clinicId)))
        .limit(1);
      return row ?? null;
    },

    async createPayer(clinicId, input, actorId) {
      const [row] = await db.transaction(async (tx) => {
        const inserted = await tx.insert(hmoPayers).values({
          clinicId,
          name: input.name.trim(),
          accreditationNumber: input.accreditationNumber?.trim() ?? null,
          contactPerson: input.contactPerson?.trim() ?? null,
          contactPhone: input.contactPhone?.trim() ?? null,
          contactEmail: input.contactEmail?.trim() ?? null,
          notes: input.notes?.trim() ?? null,
        }).returning();

        await tx.insert(auditEvents).values({
          clinicId,
          actorId,
          action: 'hmo_payer.created',
          entityType: 'hmo_payer',
          entityId: inserted[0].id,
          metadata: JSON.stringify({ name: input.name }),
        });

        return inserted;
      });
      return row;
    },

    async updatePayer(clinicId, payerId, input, actorId) {
      const existing = await this.getPayer(clinicId, payerId);
      if (!existing) throw new HmoServiceError('NOT_FOUND', 'HMO payer not found');

      const updates: Partial<typeof hmoPayers.$inferInsert> = { updatedAt: new Date() };
      if (input.name !== undefined) updates.name = input.name.trim();
      if (input.accreditationNumber !== undefined) updates.accreditationNumber = input.accreditationNumber.trim() || null;
      if (input.contactPerson !== undefined) updates.contactPerson = input.contactPerson.trim() || null;
      if (input.contactPhone !== undefined) updates.contactPhone = input.contactPhone.trim() || null;
      if (input.contactEmail !== undefined) updates.contactEmail = input.contactEmail.trim() || null;
      if (input.notes !== undefined) updates.notes = input.notes.trim() || null;
      if (input.isActive !== undefined) updates.isActive = input.isActive;

      await db.transaction(async (tx) => {
        await tx.update(hmoPayers).set(updates)
          .where(and(eq(hmoPayers.id, payerId), eq(hmoPayers.clinicId, clinicId)));
        await tx.insert(auditEvents).values({
          clinicId,
          actorId,
          action: 'hmo_payer.updated',
          entityType: 'hmo_payer',
          entityId: payerId,
          metadata: JSON.stringify(updates),
        });
      });
    },

    // ── Patient memberships ──────────────────────────────────────────────

    async listMemberships(clinicId, patientId) {
      return db.select().from(patientHmoMemberships)
        .where(and(
          eq(patientHmoMemberships.clinicId, clinicId),
          eq(patientHmoMemberships.patientId, patientId),
        ))
        .orderBy(desc(patientHmoMemberships.createdAt));
    },

    async upsertMembership(clinicId, patientId, input) {
      return db.transaction(async (tx) => {
        // Patient must belong to this clinic
        const [pat] = await tx.select({ id: patients.id })
          .from(patients)
          .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)))
          .limit(1);
        if (!pat) throw new HmoServiceError('NOT_FOUND', 'Patient not found in this clinic');

        // Payer must belong to this clinic (if supplied)
        if (input.hmoPayer) {
          const [payer] = await tx.select({ id: hmoPayers.id })
            .from(hmoPayers)
            .where(and(eq(hmoPayers.id, input.hmoPayer), eq(hmoPayers.clinicId, clinicId)))
            .limit(1);
          if (!payer) throw new HmoServiceError('NOT_FOUND', 'HMO payer not found in this clinic');
        }

        const [row] = await tx.insert(patientHmoMemberships).values({
          clinicId,
          patientId,
          hmoPayer: input.hmoPayer ?? null,
          payerNameSnapshot: input.payerNameSnapshot.trim(),
          cardNumber: input.cardNumber.trim(),
          memberName: input.memberName?.trim() ?? null,
          coverageType: input.coverageType,
          effectiveDate: input.effectiveDate ?? null,
          expiryDate: input.expiryDate ?? null,
          notes: input.notes?.trim() ?? null,
        }).returning();
        return row;
      });
    },

    async deleteMembership(clinicId, patientId, membershipId) {
      const [row] = await db.select({ id: patientHmoMemberships.id })
        .from(patientHmoMemberships)
        .where(and(
          eq(patientHmoMemberships.id, membershipId),
          eq(patientHmoMemberships.clinicId, clinicId),
          eq(patientHmoMemberships.patientId, patientId),
        ))
        .limit(1);
      if (!row) throw new HmoServiceError('NOT_FOUND', 'Membership not found');
      await db.delete(patientHmoMemberships)
        .where(and(
          eq(patientHmoMemberships.id, membershipId),
          eq(patientHmoMemberships.clinicId, clinicId),
          eq(patientHmoMemberships.patientId, patientId),
        ));
    },

    // ── Claims ──────────────────────────────────────────────────────────

    async listClaims(clinicId, { status, page, pageSize }) {
      const offset = (page - 1) * pageSize;
      const conditions = [eq(hmoClaims.clinicId, clinicId)];
      if (status) conditions.push(eq(hmoClaims.status, status));

      const [{ total }] = await db
        .select({ total: sql<number>`CAST(COUNT(*) AS int)` })
        .from(hmoClaims)
        .where(and(...conditions));

      const rows = await db
        .select({
          id: hmoClaims.id,
          claimNumber: hmoClaims.claimNumber,
          patientId: hmoClaims.patientId,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          payerNameSnapshot: hmoClaims.payerNameSnapshot,
          invoiceId: hmoClaims.invoiceId,
          encounterId: hmoClaims.encounterId,
          claimAmountPhp: hmoClaims.claimAmountPhp,
          approvedAmountPhp: hmoClaims.approvedAmountPhp,
          loaCode: hmoClaims.loaCode,
          status: hmoClaims.status,
          paidAt: hmoClaims.paidAt,
          submittedAt: hmoClaims.submittedAt,
          createdAt: hmoClaims.createdAt,
        })
        .from(hmoClaims)
        .leftJoin(patients, eq(hmoClaims.patientId, patients.id))
        .where(and(...conditions))
        .orderBy(desc(hmoClaims.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        total,
        data: rows.map((r) => ({
          ...r,
          patientName: `${r.patientLastName ?? ''}, ${r.patientFirstName ?? ''}`.trim().replace(/^,\s*/, ''),
        })),
      };
    },

    async getClaim(clinicId, claimId) {
      const [row] = await db
        .select({
          id: hmoClaims.id,
          claimNumber: hmoClaims.claimNumber,
          patientId: hmoClaims.patientId,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          payerNameSnapshot: hmoClaims.payerNameSnapshot,
          hmoPayer: hmoClaims.hmoPayer,
          membershipId: hmoClaims.membershipId,
          invoiceId: hmoClaims.invoiceId,
          encounterId: hmoClaims.encounterId,
          claimAmountPhp: hmoClaims.claimAmountPhp,
          approvedAmountPhp: hmoClaims.approvedAmountPhp,
          loaCode: hmoClaims.loaCode,
          status: hmoClaims.status,
          submittedAt: hmoClaims.submittedAt,
          approvedAt: hmoClaims.approvedAt,
          rejectedAt: hmoClaims.rejectedAt,
          paidAt: hmoClaims.paidAt,
          rejectionReason: hmoClaims.rejectionReason,
          notes: hmoClaims.notes,
          preparedBy: hmoClaims.preparedBy,
          createdAt: hmoClaims.createdAt,
        })
        .from(hmoClaims)
        .leftJoin(patients, eq(hmoClaims.patientId, patients.id))
        .where(and(eq(hmoClaims.id, claimId), eq(hmoClaims.clinicId, clinicId)))
        .limit(1);

      if (!row) return null;
      return {
        ...row,
        patientName: `${row.patientLastName ?? ''}, ${row.patientFirstName ?? ''}`.trim().replace(/^,\s*/, ''),
      };
    },

    async createClaim(clinicId, input, actorId) {
      const claimNumber = await generateClaimNumber(db);

      const [row] = await db.transaction(async (tx) => {
        // 1. Patient must belong to this clinic
        const [pat] = await tx.select({ id: patients.id })
          .from(patients)
          .where(and(eq(patients.id, input.patientId), eq(patients.clinicId, clinicId)))
          .limit(1);
        if (!pat) throw new HmoServiceError('NOT_FOUND', 'Patient not found in this clinic');

        // 2. Payer must belong to this clinic (if provided)
        if (input.hmoPayer) {
          const [payer] = await tx.select({ id: hmoPayers.id })
            .from(hmoPayers)
            .where(and(eq(hmoPayers.id, input.hmoPayer), eq(hmoPayers.clinicId, clinicId)))
            .limit(1);
          if (!payer) throw new HmoServiceError('NOT_FOUND', 'HMO payer not found in this clinic');
        }

        // 3. Membership must belong to clinic AND patient (if provided)
        if (input.membershipId) {
          const [mem] = await tx.select({ id: patientHmoMemberships.id })
            .from(patientHmoMemberships)
            .where(and(
              eq(patientHmoMemberships.id, input.membershipId),
              eq(patientHmoMemberships.clinicId, clinicId),
              eq(patientHmoMemberships.patientId, input.patientId),
            ))
            .limit(1);
          if (!mem) throw new HmoServiceError('NOT_FOUND', 'Membership not found for this patient/clinic');
        }

        // 4. Invoice must belong to clinic AND patient (if provided)
        if (input.invoiceId) {
          const [inv] = await tx.select({ id: invoices.id, patientId: invoices.patientId })
            .from(invoices)
            .where(and(eq(invoices.id, input.invoiceId), eq(invoices.clinicId, clinicId)))
            .limit(1);
          if (!inv) throw new HmoServiceError('INVOICE_NOT_FOUND', 'Invoice not found in this clinic');
          if (inv.patientId !== input.patientId) throw new HmoServiceError('FORBIDDEN', 'Invoice does not belong to this patient');
        }

        // 5. Encounter must belong to clinic AND patient (if provided)
        if (input.encounterId) {
          const [enc] = await tx.select({ id: encounters.id, patientId: encounters.patientId })
            .from(encounters)
            .where(and(eq(encounters.id, input.encounterId), eq(encounters.clinicId, clinicId)))
            .limit(1);
          if (!enc) throw new HmoServiceError('NOT_FOUND', 'Encounter not found in this clinic');
          if (enc.patientId !== input.patientId) throw new HmoServiceError('FORBIDDEN', 'Encounter does not belong to this patient');
        }

        const inserted = await tx.insert(hmoClaims).values({
          clinicId,
          patientId: input.patientId,
          hmoPayer: input.hmoPayer ?? null,
          payerNameSnapshot: input.payerNameSnapshot.trim(),
          membershipId: input.membershipId ?? null,
          invoiceId: input.invoiceId ?? null,
          encounterId: input.encounterId ?? null,
          claimNumber,
          loaCode: input.loaCode?.trim() ?? null,
          claimAmountPhp: input.claimAmountPhp,
          notes: input.notes?.trim() ?? null,
          preparedBy: actorId,
        }).returning();

        await tx.insert(auditEvents).values({
          clinicId,
          actorId,
          action: 'hmo_claim.created',
          entityType: 'hmo_claim',
          entityId: inserted[0].id,
          metadata: JSON.stringify({ claimNumber, payerName: input.payerNameSnapshot }),
        });

        return inserted;
      });
      return row;
    },

    async updateClaimStatus(clinicId, claimId, update, actorId) {
      // Pre-flight check outside transaction (fast path; race conditions caught below)
      const preFlight = await this.getClaim(clinicId, claimId);
      if (!preFlight) throw new HmoServiceError('NOT_FOUND', 'Claim not found');
      assertTransition(preFlight.status, update.to);

      await db.transaction(async (tx) => {
        // Re-read and lock the claim inside the transaction to prevent concurrent updates
        const [locked] = await tx.select({
          id: hmoClaims.id,
          status: hmoClaims.status,
          claimNumber: hmoClaims.claimNumber,
          payerNameSnapshot: hmoClaims.payerNameSnapshot,
          invoiceId: hmoClaims.invoiceId,
          approvedAmountPhp: hmoClaims.approvedAmountPhp,
          claimAmountPhp: hmoClaims.claimAmountPhp,
        }).from(hmoClaims)
          .where(and(eq(hmoClaims.id, claimId), eq(hmoClaims.clinicId, clinicId)))
          .for('update')
          .limit(1);
        if (!locked) throw new HmoServiceError('NOT_FOUND', 'Claim not found');
        // Re-assert transition with the freshly locked status (catches concurrent writes)
        assertTransition(locked.status, update.to);

        const updates: Partial<typeof hmoClaims.$inferInsert> = {
          status: update.to,
          updatedAt: new Date(),
        };
        const now = new Date();

        if (update.to === 'submitted')  updates.submittedAt = now;
        if (update.to === 'approved') {
          updates.approvedAt = now;
          updates.approvedAmountPhp = (update as { to: 'approved'; approvedAmountPhp: string }).approvedAmountPhp;
        }
        if (update.to === 'rejected') {
          updates.rejectedAt = now;
          updates.rejectionReason = (update as { to: 'rejected'; rejectionReason: string }).rejectionReason;
        }
        if (update.to === 'paid') {
          updates.paidAt = now;

          // Billing linkage: insert an invoice payment for the approved (or claimed) amount
          if (locked.invoiceId) {
            // Lock and re-read invoice to prevent concurrent payment races
            const [inv] = await tx.select({
              id: invoices.id,
              status: invoices.status,
              totalAmountPhp: invoices.totalAmountPhp,
            }).from(invoices)
              .where(and(eq(invoices.id, locked.invoiceId), eq(invoices.clinicId, clinicId)))
              .for('update')
              .limit(1);
            if (!inv) throw new HmoServiceError('INVOICE_NOT_FOUND', 'Linked invoice not found');
            if (inv.status === 'paid' || inv.status === 'voided') {
              throw new HmoServiceError('CLAIM_ALREADY_PAID', `Invoice is already ${inv.status}; cannot record HMO payment`);
            }

            // Guard: no other paid HMO claim for the same invoice
            const [dupClaim] = await tx.select({ id: hmoClaims.id })
              .from(hmoClaims)
              .where(and(
                eq(hmoClaims.invoiceId, locked.invoiceId),
                eq(hmoClaims.status, 'paid'),
              ))
              .limit(1);
            if (dupClaim) {
              throw new HmoServiceError('CLAIM_ALREADY_PAID', 'Another HMO claim for this invoice is already paid');
            }

            const payAmount = locked.approvedAmountPhp ?? locked.claimAmountPhp;
            const approved = parseFloat(payAmount);
            const total = parseFloat(inv.totalAmountPhp ?? '0');

            // Billing-integrity rule: approved amount must be a positive value that
            // exactly matches the invoice total. This prevents:
            //   - Zero-amount payments (no billing service value)
            //   - Partial payments that leave the invoice open for double-collection
            //   - Over-payments that inflate recorded revenue above the invoice charge
            // For partial HMO coverage, clinics should void the original invoice and
            // issue a new one for the co-payment remainder before marking the claim paid.
            if (approved <= 0) {
              throw new HmoServiceError(
                'INVALID_TRANSITION',
                'Approved amount must be greater than zero to record an HMO payment.',
              );
            }
            if (total <= 0) {
              throw new HmoServiceError(
                'INVALID_TRANSITION',
                'Linked invoice has a zero total; unlink the invoice before marking this claim paid.',
              );
            }
            // Use a small epsilon (0.005) to tolerate floating-point rounding in PHP amounts
            if (Math.abs(approved - total) > 0.005) {
              throw new HmoServiceError(
                'INVALID_TRANSITION',
                `Approved amount (₱${approved.toFixed(2)}) must equal the invoice total (₱${total.toFixed(2)}). ` +
                'Adjust the approved amount or void and re-issue the invoice to match.',
              );
            }

            await tx.insert(invoicePayments).values({
              invoiceId: locked.invoiceId,
              clinicId,
              amountPhp: payAmount,
              paymentMethod: 'other', // HMO reimbursement
              paymentDate: now.toISOString().slice(0, 10),
              recordedBy: actorId,
              notes: `HMO reimbursement — claim ${locked.claimNumber} (${locked.payerNameSnapshot})`,
            });

            // Mark invoice as paid (amount equality to invoice total is enforced above)
            await tx.update(invoices)
              .set({ status: 'paid', paidAt: now, updatedAt: now })
              .where(and(eq(invoices.id, locked.invoiceId), eq(invoices.clinicId, clinicId)));
          }
        }

        await tx.update(hmoClaims).set(updates)
          .where(and(
            eq(hmoClaims.id, claimId),
            eq(hmoClaims.clinicId, clinicId),
            eq(hmoClaims.status, locked.status), // predicate on current status prevents lost-update
          ));

        await tx.insert(auditEvents).values({
          clinicId,
          actorId,
          action: 'hmo_claim.status_changed',
          entityType: 'hmo_claim',
          entityId: claimId,
          metadata: JSON.stringify({ from: locked.status, to: update.to }),
        });
      });
    },

    // ── Claim PDF data ───────────────────────────────────────────────────

    async getClaimPdfData(clinicId, claimId) {
      const claim = await this.getClaim(clinicId, claimId);
      if (!claim) return null;

      // Load encounter + invoice details for the PDF
      let encounterRow: { date: string; chiefComplaint: string | null; procedures: string | null } | null = null;
      if (claim.encounterId) {
        const [enc] = await db.select({
          date: encounters.date,
          chiefComplaint: encounters.chiefComplaint,
          procedures: encounters.procedures,
        }).from(encounters)
          .where(and(eq(encounters.id, claim.encounterId), eq(encounters.clinicId, clinicId)))
          .limit(1);
        encounterRow = enc ?? null;
      }

      let invoiceRow: { invoiceNumber: string; totalAmountPhp: string } | null = null;
      if (claim.invoiceId) {
        const [inv] = await db.select({
          invoiceNumber: invoices.invoiceNumber,
          totalAmountPhp: invoices.totalAmountPhp,
        }).from(invoices)
          .where(and(eq(invoices.id, claim.invoiceId), eq(invoices.clinicId, clinicId)))
          .limit(1);
        invoiceRow = inv ?? null;
      }

      let membership: { cardNumber: string; memberName: string | null; coverageType: string; effectiveDate: string | null; expiryDate: string | null } | null = null;
      if (claim.membershipId) {
        // Scope membership read to clinic AND patient to prevent cross-tenant PII exposure
        const [mem] = await db.select({
          cardNumber: patientHmoMemberships.cardNumber,
          memberName: patientHmoMemberships.memberName,
          coverageType: patientHmoMemberships.coverageType,
          effectiveDate: patientHmoMemberships.effectiveDate,
          expiryDate: patientHmoMemberships.expiryDate,
        }).from(patientHmoMemberships)
          .where(and(
            eq(patientHmoMemberships.id, claim.membershipId),
            eq(patientHmoMemberships.clinicId, clinicId),
            eq(patientHmoMemberships.patientId, claim.patientId),
          ))
          .limit(1);
        membership = mem ?? null;
      }

      return {
        claim,
        encounter: encounterRow,
        invoice: invoiceRow,
        membership,
      };
    },
  };
}
