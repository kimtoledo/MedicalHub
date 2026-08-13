import { alias } from 'drizzle-orm/pg-core';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { clinics, supportAccessRequests, tenantExportRequests, users } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';

export type OperationsActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export class OperationsError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
export type PlatformOperationsService = ReturnType<typeof createPlatformOperationsService>;

export function createPlatformOperationsService(database: DB) {
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
    markExport: async (requestId: string, status: 'processing' | 'ready' | 'failed' | 'cancelled', actor: OperationsActor, failureReason?: string) => database.transaction(async (tx) => {
      const [current] = await tx.select().from(tenantExportRequests).where(and(eq(tenantExportRequests.id, requestId), inArray(tenantExportRequests.status, ['requested', 'processing']))).limit(1).for('update');
      if (!current) throw new OperationsError('EXPORT_NOT_FOUND', 'Open export request not found', 404);
      const [row] = await tx.update(tenantExportRequests).set({ status, completedAt: ['ready', 'failed', 'cancelled'].includes(status) ? new Date() : null, failureReason: failureReason ?? null }).where(eq(tenantExportRequests.id, requestId)).returning();
      return row;
    }),
    activeClinics: async () => database.select({ id: clinics.id, name: clinics.name, status: clinics.status, createdAt: clinics.createdAt }).from(clinics).orderBy(asc(clinics.name)),
  };
}
