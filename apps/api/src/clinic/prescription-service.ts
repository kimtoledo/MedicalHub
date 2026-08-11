import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import {
  prescriptions,
  prescriptionItems,
  patients,
  dentists,
  clinics,
  encounters,
  auditEvents,
} from '@dentra/db/schema';

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class PrescriptionError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'INVALID_STATE'
      | 'CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'PrescriptionError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PrescriptionItemInput {
  medicineName: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  specialInstructions?: string | null;
  sortOrder?: number;
}

export interface IssuePrescriptionInput {
  encounterId: string;
  prcLicenseNumber?: string | null;
  notes?: string | null;
  items: PrescriptionItemInput[];
  /** Caller's branch IDs for access control (null = clinic-wide). */
  callerBranchIds?: string[] | null;
  /** User ID of the authenticated caller. */
  issuedBy: string;
  /**
   * Dentist ID from the caller's clinic membership.
   * Required — prescriptions can only be issued by an authenticated dentist.
   * Derived server-side from the session; never trusted from the client.
   */
  callerDentistId: string;
}

export interface PrescriptionListItem {
  id: string;
  encounterId: string | null;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientNumber: string;
  dentistFirstName: string | null;
  dentistLastName: string | null;
  prcLicenseNumber: string | null;
  issuedAt: Date | null;
  createdAt: Date;
  amendedFromId: string | null;
  itemCount: number;
}

export interface PrescriptionDetail {
  id: string;
  encounterId: string | null;
  amendedFromId: string | null;
  branchId: string;
  prcLicenseNumber: string | null;
  clinicNameSnapshot: string | null;
  clinicAddressSnapshot: string | null;
  patientNameSnapshot: string | null;
  dentistNameSnapshot: string | null;
  notes: string | null;
  issuedAt: Date | null;
  issuedBy: string | null;
  createdAt: Date;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    patientNumber: string;
  };
  dentist: {
    id: string;
    firstName: string;
    lastName: string;
    licenseNumber: string | null;
  } | null;
  clinic: {
    name: string;
    address: string | null;
    city: string | null;
    phone: string | null;
    logoUrl: string | null;
  };
  items: Array<{
    id: string;
    medicineName: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    specialInstructions: string | null;
    sortOrder: number;
  }>;
}

export interface FinalizedEncounterSummary {
  id: string;
  date: string;
  branchId: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientNumber: string;
  chiefComplaint: string | null;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface ClinicPrescriptionService {
  /**
   * List finalized encounters that a caller can write prescriptions for.
   * Used to populate the encounter-selector on the new-prescription form.
   */
  listFinalizedEncounters(
    clinicId: string,
    callerBranchIds?: string[] | null,
  ): Promise<FinalizedEncounterSummary[]>;
  /**
   * Issue a new prescription from a finalized encounter.
   * Caller must be a dentist with branch access to the encounter.
   * Prescriber identity is derived server-side from callerDentistId — never from client input.
   */
  issuePrescription(
    clinicId: string,
    input: IssuePrescriptionInput,
  ): Promise<{ prescriptionId: string }>;

  /** List prescriptions for a clinic, with optional filters. */
  listPrescriptions(
    clinicId: string,
    filters: {
      patientId?: string | null;
      encounterId?: string | null;
      page: number;
      pageSize: number;
      callerBranchIds?: string[] | null;
    },
  ): Promise<{ data: PrescriptionListItem[]; total: number; page: number; pageSize: number }>;

  /** Get a single prescription with full detail. Returns null if not found or not accessible. */
  getPrescription(
    clinicId: string,
    prescriptionId: string,
    callerBranchIds?: string[] | null,
  ): Promise<PrescriptionDetail | null>;

  /**
   * Create an amendment: a new prescription linked back via amended_from_id.
   * Caller must be a dentist with branch access to the original prescription.
   */
  amendPrescription(
    clinicId: string,
    prescriptionId: string,
    input: IssuePrescriptionInput,
  ): Promise<{ prescriptionId: string }>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createClinicPrescriptionService(db: DB): ClinicPrescriptionService {
  return {
    // ──────────────────────────────────────────────────────────────────────
    // listFinalizedEncounters
    // ──────────────────────────────────────────────────────────────────────
    async listFinalizedEncounters(clinicId, callerBranchIds) {
      const conditions = [
        eq(encounters.clinicId, clinicId),
        eq(encounters.status, 'final'),
      ];
      if (callerBranchIds && callerBranchIds.length > 0) {
        conditions.push(inArray(encounters.branchId, callerBranchIds));
      }

      const rows = await db
        .select({
          id: encounters.id,
          date: encounters.date,
          branchId: encounters.branchId,
          patientId: patients.id,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientNumber: patients.patientNumber,
          chiefComplaint: encounters.chiefComplaint,
        })
        .from(encounters)
        .innerJoin(patients, eq(encounters.patientId, patients.id))
        .where(and(...conditions))
        .orderBy(desc(encounters.date))
        .limit(100);

      return rows;
    },

    // ──────────────────────────────────────────────────────────────────────
    // issuePrescription
    // ──────────────────────────────────────────────────────────────────────
    async issuePrescription(clinicId, { encounterId, prcLicenseNumber, notes, items, callerBranchIds, issuedBy, callerDentistId }) {
      if (items.length === 0) {
        throw new PrescriptionError('INVALID_STATE', 'A prescription must have at least one medicine item');
      }

      // Load encounter
      const [enc] = await db
        .select({
          id: encounters.id,
          status: encounters.status,
          branchId: encounters.branchId,
          patientId: encounters.patientId,
        })
        .from(encounters)
        .where(and(eq(encounters.id, encounterId), eq(encounters.clinicId, clinicId)))
        .limit(1);

      if (!enc) throw new PrescriptionError('NOT_FOUND', 'Encounter not found');
      if (enc.status !== 'final') throw new PrescriptionError('INVALID_STATE', 'Prescriptions can only be issued for finalized encounters');
      if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(enc.branchId)) {
        throw new PrescriptionError('FORBIDDEN', 'You do not have access to this encounter');
      }

      // Fetch snapshots using the CALLER's dentist profile (not the encounter's dentist).
      // This ensures the prescription is attributed to the authenticated prescriber.
      const [patientRow, callerDentistRow, clinicRow] = await Promise.all([
        db
          .select({ firstName: patients.firstName, lastName: patients.lastName })
          .from(patients)
          .where(eq(patients.id, enc.patientId))
          .limit(1)
          .then((r) => r[0] ?? null),
        db
          .select({ firstName: dentists.firstName, lastName: dentists.lastName, licenseNumber: dentists.licenseNumber })
          .from(dentists)
          .where(eq(dentists.id, callerDentistId))
          .limit(1)
          .then((r) => r[0] ?? null),
        db
          .select({ name: clinics.name, address: clinics.address, city: clinics.city })
          .from(clinics)
          .where(eq(clinics.id, clinicId))
          .limit(1)
          .then((r) => r[0] ?? null),
      ]);

      const dentistName = callerDentistRow
        ? `${callerDentistRow.firstName} ${callerDentistRow.lastName}`
        : null;
      // Allow dentist to override their own PRC number per prescription (e.g. in-training); fall back to profile
      const effectivePrc = prcLicenseNumber?.trim() || callerDentistRow?.licenseNumber || null;

      const now = new Date();

      // Atomic: prescription + items + audit event in one transaction
      return await db.transaction(async (tx) => {
        const [rx] = await tx
          .insert(prescriptions)
          .values({
            clinicId,
            branchId: enc.branchId,
            patientId: enc.patientId,
            dentistId: callerDentistId,
            encounterId,
            amendedFromId: null,
            prcLicenseNumber: effectivePrc,
            clinicNameSnapshot: clinicRow?.name ?? null,
            clinicAddressSnapshot: clinicRow ? [clinicRow.address, clinicRow.city].filter(Boolean).join(', ') || null : null,
            patientNameSnapshot: patientRow ? `${patientRow.firstName} ${patientRow.lastName}` : null,
            dentistNameSnapshot: dentistName,
            notes: notes ?? null,
            issuedAt: now,
            issuedBy,
          })
          .returning({ id: prescriptions.id });

        await tx.insert(prescriptionItems).values(
          items.map((item, idx) => ({
            prescriptionId: rx.id,
            clinicId,
            medicineName: item.medicineName,
            dosage: item.dosage ?? null,
            frequency: item.frequency ?? null,
            duration: item.duration ?? null,
            specialInstructions: item.specialInstructions ?? null,
            sortOrder: item.sortOrder ?? idx,
          })),
        );

        await tx.insert(auditEvents).values({
          clinicId,
          actorId: issuedBy,
          action: 'prescription.issued',
          entityType: 'prescription',
          entityId: rx.id,
          metadata: JSON.stringify({ encounterId, itemCount: items.length }),
        });

        return { prescriptionId: rx.id };
      });
    },

    // ──────────────────────────────────────────────────────────────────────
    // listPrescriptions
    // ──────────────────────────────────────────────────────────────────────
    async listPrescriptions(clinicId, { patientId, encounterId, page, pageSize, callerBranchIds }) {
      const offset = (page - 1) * pageSize;

      const conditions = [eq(prescriptions.clinicId, clinicId)];
      if (patientId) conditions.push(eq(prescriptions.patientId, patientId));
      if (encounterId) conditions.push(eq(prescriptions.encounterId, encounterId));
      if (callerBranchIds && callerBranchIds.length > 0) {
        conditions.push(inArray(prescriptions.branchId, callerBranchIds));
      }

      const where = and(...conditions);

      const [{ total }] = await db
        .select({ total: sql<number>`CAST(COUNT(*) AS int)` })
        .from(prescriptions)
        .where(where);

      const rows = await db
        .select({
          id: prescriptions.id,
          encounterId: prescriptions.encounterId,
          patientId: patients.id,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientNumber: patients.patientNumber,
          dentistFirstName: dentists.firstName,
          dentistLastName: dentists.lastName,
          prcLicenseNumber: prescriptions.prcLicenseNumber,
          issuedAt: prescriptions.issuedAt,
          createdAt: prescriptions.createdAt,
          amendedFromId: prescriptions.amendedFromId,
        })
        .from(prescriptions)
        .innerJoin(patients, eq(prescriptions.patientId, patients.id))
        .leftJoin(dentists, eq(prescriptions.dentistId, dentists.id))
        .where(where)
        .orderBy(desc(prescriptions.issuedAt))
        .limit(pageSize)
        .offset(offset);

      // Fetch item counts in one batch query
      const rxIds = rows.map((r) => r.id);
      const itemCounts: Record<string, number> = {};
      if (rxIds.length > 0) {
        const counts = await db
          .select({
            prescriptionId: prescriptionItems.prescriptionId,
            cnt: sql<number>`CAST(COUNT(*) AS int)`,
          })
          .from(prescriptionItems)
          .where(inArray(prescriptionItems.prescriptionId, rxIds))
          .groupBy(prescriptionItems.prescriptionId);
        for (const c of counts) itemCounts[c.prescriptionId] = c.cnt;
      }

      const data: PrescriptionListItem[] = rows.map((r) => ({
        id: r.id,
        encounterId: r.encounterId,
        patientId: r.patientId,
        patientFirstName: r.patientFirstName,
        patientLastName: r.patientLastName,
        patientNumber: r.patientNumber,
        dentistFirstName: r.dentistFirstName ?? null,
        dentistLastName: r.dentistLastName ?? null,
        prcLicenseNumber: r.prcLicenseNumber,
        issuedAt: r.issuedAt,
        createdAt: r.createdAt,
        amendedFromId: r.amendedFromId,
        itemCount: itemCounts[r.id] ?? 0,
      }));

      return { data, total, page, pageSize };
    },

    // ──────────────────────────────────────────────────────────────────────
    // getPrescription
    // ──────────────────────────────────────────────────────────────────────
    async getPrescription(clinicId, prescriptionId, callerBranchIds) {
      const [row] = await db
        .select({
          id: prescriptions.id,
          encounterId: prescriptions.encounterId,
          amendedFromId: prescriptions.amendedFromId,
          branchId: prescriptions.branchId,
          prcLicenseNumber: prescriptions.prcLicenseNumber,
          clinicNameSnapshot: prescriptions.clinicNameSnapshot,
          clinicAddressSnapshot: prescriptions.clinicAddressSnapshot,
          patientNameSnapshot: prescriptions.patientNameSnapshot,
          dentistNameSnapshot: prescriptions.dentistNameSnapshot,
          notes: prescriptions.notes,
          issuedAt: prescriptions.issuedAt,
          issuedBy: prescriptions.issuedBy,
          createdAt: prescriptions.createdAt,
          // patient
          patientId: patients.id,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientNumber: patients.patientNumber,
          // dentist (nullable join)
          dentistId: dentists.id,
          dentistFirstName: dentists.firstName,
          dentistLastName: dentists.lastName,
          dentistLicenseNumber: dentists.licenseNumber,
          // clinic
          clinicName: clinics.name,
          clinicAddress: clinics.address,
          clinicCity: clinics.city,
          clinicPhone: clinics.phone,
          clinicLogoUrl: clinics.logoUrl,
        })
        .from(prescriptions)
        .innerJoin(patients, eq(prescriptions.patientId, patients.id))
        .leftJoin(dentists, eq(prescriptions.dentistId, dentists.id))
        .innerJoin(clinics, eq(prescriptions.clinicId, clinics.id))
        .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.clinicId, clinicId)))
        .limit(1);

      if (!row) return null;
      if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(row.branchId)) return null;

      const items = await db
        .select({
          id: prescriptionItems.id,
          medicineName: prescriptionItems.medicineName,
          dosage: prescriptionItems.dosage,
          frequency: prescriptionItems.frequency,
          duration: prescriptionItems.duration,
          specialInstructions: prescriptionItems.specialInstructions,
          sortOrder: prescriptionItems.sortOrder,
        })
        .from(prescriptionItems)
        .where(eq(prescriptionItems.prescriptionId, prescriptionId))
        .orderBy(prescriptionItems.sortOrder);

      return {
        id: row.id,
        encounterId: row.encounterId,
        amendedFromId: row.amendedFromId,
        branchId: row.branchId,
        prcLicenseNumber: row.prcLicenseNumber,
        clinicNameSnapshot: row.clinicNameSnapshot,
        clinicAddressSnapshot: row.clinicAddressSnapshot,
        patientNameSnapshot: row.patientNameSnapshot,
        dentistNameSnapshot: row.dentistNameSnapshot,
        notes: row.notes,
        issuedAt: row.issuedAt,
        issuedBy: row.issuedBy,
        createdAt: row.createdAt,
        patient: {
          id: row.patientId,
          firstName: row.patientFirstName,
          lastName: row.patientLastName,
          patientNumber: row.patientNumber,
        },
        dentist: row.dentistId ? {
          id: row.dentistId,
          firstName: row.dentistFirstName!,
          lastName: row.dentistLastName!,
          licenseNumber: row.dentistLicenseNumber ?? null,
        } : null,
        clinic: {
          name: row.clinicName,
          address: row.clinicAddress ?? null,
          city: row.clinicCity ?? null,
          phone: row.clinicPhone ?? null,
          logoUrl: row.clinicLogoUrl ?? null,
        },
        items: items.map((i) => ({
          id: i.id,
          medicineName: i.medicineName,
          dosage: i.dosage,
          frequency: i.frequency,
          duration: i.duration,
          specialInstructions: i.specialInstructions,
          sortOrder: i.sortOrder,
        })),
      };
    },

    // ──────────────────────────────────────────────────────────────────────
    // amendPrescription
    // ──────────────────────────────────────────────────────────────────────
    async amendPrescription(clinicId, prescriptionId, input) {
      if (input.items.length === 0) {
        throw new PrescriptionError('INVALID_STATE', 'An amendment must have at least one medicine item');
      }

      // Load the original prescription
      const [original] = await db
        .select({
          id: prescriptions.id,
          branchId: prescriptions.branchId,
          patientId: prescriptions.patientId,
          encounterId: prescriptions.encounterId,
        })
        .from(prescriptions)
        .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.clinicId, clinicId)))
        .limit(1);

      if (!original) throw new PrescriptionError('NOT_FOUND', 'Prescription not found');
      if (input.callerBranchIds && input.callerBranchIds.length > 0 && !input.callerBranchIds.includes(original.branchId)) {
        throw new PrescriptionError('FORBIDDEN', 'You do not have access to this prescription');
      }

      // Fetch snapshots using the CALLER's dentist profile
      const [patientRow, callerDentistRow, clinicRow] = await Promise.all([
        db.select({ firstName: patients.firstName, lastName: patients.lastName }).from(patients).where(eq(patients.id, original.patientId)).limit(1).then((r) => r[0] ?? null),
        db.select({ firstName: dentists.firstName, lastName: dentists.lastName, licenseNumber: dentists.licenseNumber }).from(dentists).where(eq(dentists.id, input.callerDentistId)).limit(1).then((r) => r[0] ?? null),
        db.select({ name: clinics.name, address: clinics.address, city: clinics.city }).from(clinics).where(eq(clinics.id, clinicId)).limit(1).then((r) => r[0] ?? null),
      ]);

      const dentistName = callerDentistRow
        ? `${callerDentistRow.firstName} ${callerDentistRow.lastName}`
        : null;
      const effectivePrc = input.prcLicenseNumber?.trim() || callerDentistRow?.licenseNumber || null;
      const now = new Date();

      // Atomic: amendment prescription + items + audit event in one transaction
      return await db.transaction(async (tx) => {
        const [rx] = await tx
          .insert(prescriptions)
          .values({
            clinicId,
            branchId: original.branchId,
            patientId: original.patientId,
            dentistId: input.callerDentistId,
            encounterId: original.encounterId ?? null,
            amendedFromId: prescriptionId,
            prcLicenseNumber: effectivePrc,
            clinicNameSnapshot: clinicRow?.name ?? null,
            clinicAddressSnapshot: clinicRow ? [clinicRow.address, clinicRow.city].filter(Boolean).join(', ') || null : null,
            patientNameSnapshot: patientRow ? `${patientRow.firstName} ${patientRow.lastName}` : null,
            dentistNameSnapshot: dentistName,
            notes: input.notes ?? null,
            issuedAt: now,
            issuedBy: input.issuedBy,
          })
          .returning({ id: prescriptions.id });

        await tx.insert(prescriptionItems).values(
          input.items.map((item, idx) => ({
            prescriptionId: rx.id,
            clinicId,
            medicineName: item.medicineName,
            dosage: item.dosage ?? null,
            frequency: item.frequency ?? null,
            duration: item.duration ?? null,
            specialInstructions: item.specialInstructions ?? null,
            sortOrder: item.sortOrder ?? idx,
          })),
        );

        await tx.insert(auditEvents).values({
          clinicId,
          actorId: input.issuedBy,
          action: 'prescription.issued',
          entityType: 'prescription',
          entityId: rx.id,
          metadata: JSON.stringify({ amendedFrom: prescriptionId, encounterId: original.encounterId }),
        });

        return { prescriptionId: rx.id };
      });
    },
  };
}
