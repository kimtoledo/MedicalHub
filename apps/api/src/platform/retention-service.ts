import { and, eq, isNotNull, isNull, lte, notInArray } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { clinics, dataRetentionFlags } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';

export type RetentionActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export class RetentionError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
export type RetentionService = ReturnType<typeof createRetentionService>;

/**
 * Archived clinics past this many days are flagged for a Super Admin
 * to review — never auto-deleted or auto-anonymized. 90 days mirrors
 * common healthcare/SaaS retention-review defaults.
 */
const REVIEW_WINDOW_DAYS = 90;

export function createRetentionService(database: DB) {
  return {
    /**
     * Finds archived clinics past the review window with no existing
     * unresolved flag, and creates one. Safe to call repeatedly (boot
     * sweep or manual "scan now") — never touches clinic data itself.
     */
    scan: async () => {
      const cutoff = new Date(Date.now() - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const alreadyFlagged = await database.select({ clinicId: dataRetentionFlags.clinicId }).from(dataRetentionFlags).where(eq(dataRetentionFlags.status, 'pending'));
      const flaggedIds = alreadyFlagged.map((row) => row.clinicId);
      const candidates = await database.select({ id: clinics.id, archivedAt: clinics.archivedAt }).from(clinics).where(and(
        eq(clinics.status, 'archived'),
        isNotNull(clinics.archivedAt),
        lte(clinics.archivedAt, cutoff),
        isNull(clinics.deletedAt),
        flaggedIds.length ? notInArray(clinics.id, flaggedIds) : undefined,
      ));
      const created = [];
      for (const candidate of candidates) {
        const [row] = await database.insert(dataRetentionFlags).values({ clinicId: candidate.id, clinicArchivedAt: candidate.archivedAt! }).returning();
        await writeAudit(database, { actorId: null, clinicId: candidate.id, entityType: 'data_retention_flag', entityId: row.id, action: AuditAction.DATA_RETENTION_FLAGGED, metadata: JSON.stringify({ reviewWindowDays: REVIEW_WINDOW_DAYS }) });
        created.push(row);
      }
      return { flagged: created.length, reviewWindowDays: REVIEW_WINDOW_DAYS };
    },

    list: async (status?: 'pending' | 'dismissed' | 'anonymize_requested' | 'delete_requested') => database
      .select({ id: dataRetentionFlags.id, clinicId: dataRetentionFlags.clinicId, clinicName: clinics.name, clinicArchivedAt: dataRetentionFlags.clinicArchivedAt, status: dataRetentionFlags.status, resolvedAt: dataRetentionFlags.resolvedAt, resolutionNotes: dataRetentionFlags.resolutionNotes, createdAt: dataRetentionFlags.createdAt })
      .from(dataRetentionFlags)
      .innerJoin(clinics, eq(clinics.id, dataRetentionFlags.clinicId))
      .where(status ? eq(dataRetentionFlags.status, status) : undefined)
      .orderBy(dataRetentionFlags.createdAt),

    resolve: async (flagId: string, resolution: 'dismissed' | 'anonymize_requested' | 'delete_requested', notes: string, actor: RetentionActor) => database.transaction(async (tx) => {
      const [flag] = await tx.select().from(dataRetentionFlags).where(and(eq(dataRetentionFlags.id, flagId), eq(dataRetentionFlags.status, 'pending'))).limit(1).for('update');
      if (!flag) throw new RetentionError('FLAG_NOT_FOUND', 'Pending retention flag not found', 404);
      const [updated] = await tx.update(dataRetentionFlags).set({ status: resolution, resolvedBy: actor.id, resolvedAt: new Date(), resolutionNotes: notes }).where(eq(dataRetentionFlags.id, flagId)).returning();
      await writeAudit(tx, { actorId: actor.id, actorEmail: actor.email, clinicId: flag.clinicId, entityType: 'data_retention_flag', entityId: flagId, action: AuditAction.DATA_RETENTION_RESOLVED, metadata: JSON.stringify({ resolution }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return updated;
    }),
  };
}
