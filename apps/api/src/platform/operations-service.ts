import { Client as StorageClient } from '@replit/object-storage';
import { alias } from 'drizzle-orm/pg-core';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import {
  appointmentStatusHistory, appointments, branches, clinicReviews, clinicalFiles, clinics,
  encounters, featureFlagClinics, featureFlags, hmoClaims, hmoPayers, inventoryItems, inventoryTransactions,
  invoiceLineItems, invoicePayments, invoiceTransactions, invoices, odontogramEvents, patientDentalHistories,
  patientHmoMemberships, patientMedicalHistories, patients, prescriptionItems, prescriptions,
  services, supportAccessRequests, tenantExportRequests, treatmentPlanItems, treatmentPlans,
  treatmentRecords, users,
} from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';
import { generateSignedToken, verifySignedToken } from '../clinic/clinical-files-service.js';

export type OperationsActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export class OperationsError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
export type PlatformOperationsService = ReturnType<typeof createPlatformOperationsService>;

// Tables directly scoped by clinicId that make up a clinic's structured data
// export. Staff/auth records, audit logs, and stored file *binaries* are
// intentionally excluded — see EXCLUDED_FROM_EXPORT below.
const EXCLUDED_FROM_EXPORT = [
  'Staff accounts and login credentials (request via support access instead)',
  'Audit logs',
  'Uploaded file binaries (radiographs/photos) — metadata is included; retrieve originals individually via existing signed file URLs',
  'Payment provider secrets and platform billing records',
];

async function gatherClinicExportTables(database: DB, clinicId: string) {
  const byClinic = (table: { clinicId: any }) => eq(table.clinicId, clinicId);
  const [
    patientRows, medicalHistoryRows, dentalHistoryRows, branchRows, serviceRows,
    appointmentRows, appointmentHistoryRows, encounterRows, treatmentRecordRows,
    treatmentPlanRows, treatmentPlanItemRows, invoiceRows, invoiceLineItemRows,
    invoicePaymentRows, invoiceTransactionRows, prescriptionRows, prescriptionItemRows,
    odontogramRows, fileRows, reviewRows, hmoPayerRows, hmoMembershipRows, hmoClaimRows,
    inventoryItemRows, inventoryTransactionRows,
  ] = await Promise.all([
    database.select().from(patients).where(byClinic(patients)),
    database.select().from(patientMedicalHistories).where(byClinic(patientMedicalHistories)),
    database.select().from(patientDentalHistories).where(byClinic(patientDentalHistories)),
    database.select().from(branches).where(byClinic(branches)),
    database.select().from(services).where(byClinic(services)),
    database.select().from(appointments).where(byClinic(appointments)),
    database.select().from(appointmentStatusHistory).where(byClinic(appointmentStatusHistory)),
    database.select().from(encounters).where(byClinic(encounters)),
    database.select().from(treatmentRecords).where(byClinic(treatmentRecords)),
    database.select().from(treatmentPlans).where(byClinic(treatmentPlans)),
    database.select().from(treatmentPlanItems).where(byClinic(treatmentPlanItems)),
    database.select().from(invoices).where(byClinic(invoices)),
    database.select().from(invoiceLineItems).where(byClinic(invoiceLineItems)),
    database.select().from(invoicePayments).where(byClinic(invoicePayments)),
    database.select().from(invoiceTransactions).where(byClinic(invoiceTransactions)),
    database.select().from(prescriptions).where(byClinic(prescriptions)),
    database.select().from(prescriptionItems).where(byClinic(prescriptionItems)),
    database.select().from(odontogramEvents).where(byClinic(odontogramEvents)),
    database.select().from(clinicalFiles).where(byClinic(clinicalFiles)),
    database.select().from(clinicReviews).where(byClinic(clinicReviews)),
    database.select().from(hmoPayers).where(byClinic(hmoPayers)),
    database.select().from(patientHmoMemberships).where(byClinic(patientHmoMemberships)),
    database.select().from(hmoClaims).where(byClinic(hmoClaims)),
    database.select().from(inventoryItems).where(byClinic(inventoryItems)),
    database.select().from(inventoryTransactions).where(byClinic(inventoryTransactions)),
  ]);
  return {
    patients: patientRows, patientMedicalHistories: medicalHistoryRows, patientDentalHistories: dentalHistoryRows,
    branches: branchRows, services: serviceRows, appointments: appointmentRows, appointmentStatusHistory: appointmentHistoryRows,
    encounters: encounterRows, treatmentRecords: treatmentRecordRows, treatmentPlans: treatmentPlanRows,
    treatmentPlanItems: treatmentPlanItemRows, invoices: invoiceRows, invoiceLineItems: invoiceLineItemRows,
    invoicePayments: invoicePaymentRows, invoiceTransactions: invoiceTransactionRows, prescriptions: prescriptionRows,
    prescriptionItems: prescriptionItemRows, odontogramEvents: odontogramRows, clinicalFiles: fileRows,
    clinicReviews: reviewRows, hmoPayers: hmoPayerRows, patientHmoMemberships: hmoMembershipRows, hmoClaims: hmoClaimRows,
    inventoryItems: inventoryItemRows, inventoryTransactions: inventoryTransactionRows,
  };
}

export function createPlatformOperationsService(database: DB) {
  let _storage: StorageClient | null = null;
  function storage(): StorageClient {
    if (!_storage) _storage = new StorageClient();
    return _storage;
  }
  return {
    requestSupportAccess: async (clinicId: string, reason: string, actor: OperationsActor) => {
      const [row] = await database.insert(supportAccessRequests).values({ clinicId, requestedBy: actor.id, reason }).returning();
      if (!row) throw new OperationsError('REQUEST_FAILED', 'Unable to create support request', 500);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'support_access_request', entityId: row.id, action: AuditAction.SUPPORT_ACCESS_REQUESTED, metadata: JSON.stringify({}), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    },
    listSupportAccess: async (clinicId?: string) => { const reviewer = alias(users, 'reviewer'); return database.select({ id: supportAccessRequests.id, clinicId: supportAccessRequests.clinicId, clinicName: clinics.name, requestedBy: supportAccessRequests.requestedBy, requestedByEmail: users.email, reason: supportAccessRequests.reason, status: supportAccessRequests.status, reviewedBy: supportAccessRequests.reviewedBy, reviewedByEmail: reviewer.email, reviewedAt: supportAccessRequests.reviewedAt, expiresAt: supportAccessRequests.expiresAt, usedAt: supportAccessRequests.usedAt, createdAt: supportAccessRequests.createdAt }).from(supportAccessRequests).innerJoin(clinics, eq(supportAccessRequests.clinicId, clinics.id)).innerJoin(users, eq(supportAccessRequests.requestedBy, users.id)).leftJoin(reviewer, eq(supportAccessRequests.reviewedBy, reviewer.id)).where(clinicId ? eq(supportAccessRequests.clinicId, clinicId) : undefined).orderBy(desc(supportAccessRequests.createdAt)); },
    reviewSupportAccess: async (requestId: string, status: 'approved' | 'denied', actor: OperationsActor) => database.transaction(async (tx) => {
      const [current] = await tx.select().from(supportAccessRequests).where(and(eq(supportAccessRequests.id, requestId), eq(supportAccessRequests.status, 'pending'))).limit(1).for('update');
      if (!current) throw new OperationsError('REQUEST_NOT_FOUND', 'Pending support request not found', 404);
      const expiresAt = status === 'approved' ? new Date(Date.now() + 30 * 60_000) : null;
      const [row] = await tx.update(supportAccessRequests).set({ status, reviewedBy: actor.id, reviewedAt: new Date(), expiresAt }).where(eq(supportAccessRequests.id, requestId)).returning();
      await writeAudit(tx, { actorId: actor.id, actorEmail: actor.email, clinicId: current.clinicId, entityType: 'support_access_request', entityId: requestId, action: AuditAction.SUPPORT_ACCESS_REVIEWED, metadata: JSON.stringify({ status, expiresAt }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    }),
    requestExport: async (clinicId: string, actor: OperationsActor) => {
      const [row] = await database.insert(tenantExportRequests).values({ clinicId, requestedBy: actor.id, retentionUntil: new Date(Date.now() + 30 * 86_400_000) }).returning();
      if (!row) throw new OperationsError('EXPORT_REQUEST_FAILED', 'Unable to create export request', 500);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'tenant_export_request', entityId: row.id, action: AuditAction.TENANT_EXPORT_REQUESTED, metadata: JSON.stringify({}), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    },
    listExports: async (clinicId?: string) => database.select({ id: tenantExportRequests.id, clinicId: tenantExportRequests.clinicId, clinicName: clinics.name, requestedBy: tenantExportRequests.requestedBy, requestedByEmail: users.email, status: tenantExportRequests.status, requestedAt: tenantExportRequests.requestedAt, completedAt: tenantExportRequests.completedAt, retentionUntil: tenantExportRequests.retentionUntil, failureReason: tenantExportRequests.failureReason, artifactReference: tenantExportRequests.artifactReference, createdAt: tenantExportRequests.createdAt }).from(tenantExportRequests).innerJoin(clinics, eq(tenantExportRequests.clinicId, clinics.id)).innerJoin(users, eq(tenantExportRequests.requestedBy, users.id)).where(clinicId ? eq(tenantExportRequests.clinicId, clinicId) : undefined).orderBy(desc(tenantExportRequests.createdAt)),
    // 'ready' is set only by generateExport, which produces the artifact it names.
    markExport: async (requestId: string, status: 'processing' | 'failed' | 'cancelled', actor: OperationsActor, failureReason?: string) => database.transaction(async (tx) => {
      const [current] = await tx.select().from(tenantExportRequests).where(and(eq(tenantExportRequests.id, requestId), inArray(tenantExportRequests.status, ['requested', 'processing']))).limit(1).for('update');
      if (!current) throw new OperationsError('EXPORT_NOT_FOUND', 'Open export request not found', 404);
      const [row] = await tx.update(tenantExportRequests).set({ status, completedAt: ['failed', 'cancelled'].includes(status) ? new Date() : null, failureReason: failureReason ?? null }).where(eq(tenantExportRequests.id, requestId)).returning();
      return row;
    }),
    generateExport: async (requestId: string, actor: OperationsActor) => {
      const [current] = await database.select({ id: tenantExportRequests.id, clinicId: tenantExportRequests.clinicId, status: tenantExportRequests.status }).from(tenantExportRequests).where(and(eq(tenantExportRequests.id, requestId), inArray(tenantExportRequests.status, ['requested', 'processing']))).limit(1);
      if (!current) throw new OperationsError('EXPORT_NOT_FOUND', 'Open export request not found', 404);
      const [clinicRow] = await database.select({ id: clinics.id, name: clinics.name }).from(clinics).where(eq(clinics.id, current.clinicId)).limit(1);
      if (!clinicRow) throw new OperationsError('CLINIC_NOT_FOUND', 'Clinic not found', 404);
      await database.update(tenantExportRequests).set({ status: 'processing' }).where(eq(tenantExportRequests.id, requestId));
      try {
        const tables = await gatherClinicExportTables(database, current.clinicId);
        const document = { exportedAt: new Date().toISOString(), clinicId: current.clinicId, clinicName: clinicRow.name, tables, excludedFromExport: EXCLUDED_FROM_EXPORT };
        const storageKey = `exports/${current.clinicId}/${requestId}.json`;
        const uploadResult = await storage().uploadFromBytes(storageKey, Buffer.from(JSON.stringify(document, null, 2), 'utf8'));
        if (!uploadResult.ok) throw new OperationsError('EXPORT_UPLOAD_FAILED', 'Unable to store the export artifact', 500);
        const [row] = await database.update(tenantExportRequests).set({ status: 'ready', completedAt: new Date(), artifactReference: storageKey, failureReason: null }).where(eq(tenantExportRequests.id, requestId)).returning();
        await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId: current.clinicId, entityType: 'tenant_export_request', entityId: requestId, action: AuditAction.TENANT_EXPORT_GENERATED, metadata: JSON.stringify({ tableRowCounts: Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, rows.length])) }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        return row;
      } catch (caught) {
        const message = caught instanceof OperationsError ? caught.message : 'Export generation failed unexpectedly';
        await database.update(tenantExportRequests).set({ status: 'failed', completedAt: new Date(), failureReason: message }).where(eq(tenantExportRequests.id, requestId));
        throw caught instanceof OperationsError ? caught : new OperationsError('EXPORT_FAILED', message, 500);
      }
    },
    downloadUrl: async (requestId: string, actor: OperationsActor, expectedClinicId?: string) => {
      const [row] = await database.select({ id: tenantExportRequests.id, clinicId: tenantExportRequests.clinicId, status: tenantExportRequests.status, artifactReference: tenantExportRequests.artifactReference }).from(tenantExportRequests).where(eq(tenantExportRequests.id, requestId)).limit(1);
      if (!row || (expectedClinicId && row.clinicId !== expectedClinicId)) throw new OperationsError('EXPORT_NOT_FOUND', 'Export request not found', 404);
      if (row.status !== 'ready' || !row.artifactReference) throw new OperationsError('EXPORT_NOT_READY', 'Export artifact is not ready yet', 409);
      const token = generateSignedToken(requestId, row.clinicId);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId: row.clinicId, entityType: 'tenant_export_request', entityId: requestId, action: AuditAction.TENANT_EXPORT_DOWNLOAD_LINK_ISSUED, metadata: JSON.stringify({}), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return { downloadUrl: `/v1/clinic/${row.clinicId}/operations/exports/${requestId}/download?token=${token}` };
    },
    streamExport: async (token: string) => {
      const verified = verifySignedToken(token);
      if (!verified) return null;
      const [row] = await database.select({ id: tenantExportRequests.id, artifactReference: tenantExportRequests.artifactReference, status: tenantExportRequests.status }).from(tenantExportRequests).where(and(eq(tenantExportRequests.id, verified.fileId), eq(tenantExportRequests.clinicId, verified.clinicId))).limit(1);
      if (!row || row.status !== 'ready' || !row.artifactReference) return null;
      const result = await storage().downloadAsBytes(row.artifactReference);
      if (!result.ok) return null;
      const [buffer] = result.value;
      return { buffer, filename: `dentra-export-${row.id}.json` };
    },
    activeClinics: async () => database.select({ id: clinics.id, name: clinics.name, status: clinics.status, maintenanceMode: clinics.maintenanceMode, createdAt: clinics.createdAt }).from(clinics).orderBy(asc(clinics.name)),
    // Real usage from clinicalFiles.sizeBytes, which every upload already
    // records — no new instrumentation. Tenant export artifacts sit in the
    // same object-storage bucket but their size isn't tracked in the DB,
    // so this is clinical-file storage specifically, labeled as such.
    storageUsage: async () => {
      const [totalRow] = await database.select({ totalBytes: sql<string>`coalesce(sum(${clinicalFiles.sizeBytes}), 0)`, fileCount: sql<string>`count(*)` }).from(clinicalFiles);
      const byClinic = await database.select({ clinicId: clinicalFiles.clinicId, clinicName: clinics.name, totalBytes: sql<string>`coalesce(sum(${clinicalFiles.sizeBytes}), 0)`, fileCount: sql<string>`count(*)` }).from(clinicalFiles).innerJoin(clinics, eq(clinics.id, clinicalFiles.clinicId)).groupBy(clinicalFiles.clinicId, clinics.name).orderBy(desc(sql`sum(${clinicalFiles.sizeBytes})`)).limit(10);
      return { totalBytes: Number(totalRow?.totalBytes ?? 0), fileCount: Number(totalRow?.fileCount ?? 0), topClinics: byClinic.map((row) => ({ clinicId: row.clinicId, clinicName: row.clinicName, totalBytes: Number(row.totalBytes), fileCount: Number(row.fileCount) })) };
    },
    setMaintenanceMode: async (clinicId: string, enabled: boolean, actor: OperationsActor) => {
      const [row] = await database.update(clinics).set({ maintenanceMode: enabled }).where(eq(clinics.id, clinicId)).returning({ id: clinics.id, name: clinics.name, maintenanceMode: clinics.maintenanceMode });
      if (!row) throw new OperationsError('CLINIC_NOT_FOUND', 'Clinic not found', 404);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'clinic', entityId: clinicId, action: AuditAction.CLINIC_MAINTENANCE_MODE_UPDATED, metadata: JSON.stringify({ enabled }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    },
    listFeatureFlags: async () => {
      const flags = await database.select().from(featureFlags).orderBy(desc(featureFlags.createdAt));
      const targets = await database.select({ flagId: featureFlagClinics.flagId, clinicId: featureFlagClinics.clinicId, clinicName: clinics.name }).from(featureFlagClinics).innerJoin(clinics, eq(featureFlagClinics.clinicId, clinics.id));
      const byFlag = new Map<string, Array<{ clinicId: string; clinicName: string }>>();
      for (const target of targets) { const list = byFlag.get(target.flagId) ?? []; list.push({ clinicId: target.clinicId, clinicName: target.clinicName }); byFlag.set(target.flagId, list); }
      return flags.map((flag) => ({ ...flag, clinics: byFlag.get(flag.id) ?? [] }));
    },
    createFeatureFlag: async (input: { key: string; name: string; description?: string | null }, actor: OperationsActor) => {
      const [existing] = await database.select({ id: featureFlags.id }).from(featureFlags).where(eq(featureFlags.key, input.key)).limit(1);
      if (existing) throw new OperationsError('FLAG_KEY_TAKEN', 'A feature flag with this key already exists', 409);
      const [row] = await database.insert(featureFlags).values({ key: input.key, name: input.name, description: input.description ?? null }).returning();
      if (!row) throw new OperationsError('FLAG_CREATE_FAILED', 'Unable to create feature flag', 500);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, entityType: 'feature_flag', entityId: row.id, action: AuditAction.FEATURE_FLAG_CREATED, metadata: JSON.stringify({ key: input.key }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    },
    setFeatureFlagRollout: async (flagId: string, enabledByDefault: boolean, actor: OperationsActor) => {
      const [row] = await database.update(featureFlags).set({ enabledByDefault }).where(eq(featureFlags.id, flagId)).returning();
      if (!row) throw new OperationsError('FLAG_NOT_FOUND', 'Feature flag not found', 404);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, entityType: 'feature_flag', entityId: flagId, action: AuditAction.FEATURE_FLAG_ROLLOUT_UPDATED, metadata: JSON.stringify({ enabledByDefault }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    },
    addFeatureFlagClinic: async (flagId: string, clinicId: string, actor: OperationsActor) => {
      const [flag] = await database.select({ id: featureFlags.id }).from(featureFlags).where(eq(featureFlags.id, flagId)).limit(1);
      if (!flag) throw new OperationsError('FLAG_NOT_FOUND', 'Feature flag not found', 404);
      const [clinicRow] = await database.select({ id: clinics.id }).from(clinics).where(eq(clinics.id, clinicId)).limit(1);
      if (!clinicRow) throw new OperationsError('CLINIC_NOT_FOUND', 'Clinic not found', 404);
      const [existing] = await database.select({ id: featureFlagClinics.id }).from(featureFlagClinics).where(and(eq(featureFlagClinics.flagId, flagId), eq(featureFlagClinics.clinicId, clinicId))).limit(1);
      if (existing) throw new OperationsError('CLINIC_ALREADY_TARGETED', 'This clinic already has the flag enabled', 409);
      const [row] = await database.insert(featureFlagClinics).values({ flagId, clinicId }).returning();
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'feature_flag', entityId: flagId, action: AuditAction.FEATURE_FLAG_CLINIC_ADDED, metadata: JSON.stringify({}), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    },
    removeFeatureFlagClinic: async (flagId: string, clinicId: string, actor: OperationsActor) => {
      const deleted = await database.delete(featureFlagClinics).where(and(eq(featureFlagClinics.flagId, flagId), eq(featureFlagClinics.clinicId, clinicId))).returning();
      if (!deleted.length) throw new OperationsError('CLINIC_NOT_TARGETED', 'This clinic is not targeted by the flag', 404);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'feature_flag', entityId: flagId, action: AuditAction.FEATURE_FLAG_CLINIC_REMOVED, metadata: JSON.stringify({}), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return { removed: true };
    },
    isFeatureEnabledForClinic: async (key: string, clinicId: string) => {
      const [flag] = await database.select({ id: featureFlags.id, enabledByDefault: featureFlags.enabledByDefault }).from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
      if (!flag) return false;
      if (flag.enabledByDefault) return true;
      const [targeted] = await database.select({ id: featureFlagClinics.id }).from(featureFlagClinics).where(and(eq(featureFlagClinics.flagId, flag.id), eq(featureFlagClinics.clinicId, clinicId))).limit(1);
      return Boolean(targeted);
    },
  };
}
