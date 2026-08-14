import { and, countDistinct, eq, gt, gte, isNotNull } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { auditEvents, securityAlerts, users } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';

export type SecurityAlertActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export class SecurityAlertError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
export type SecurityAlertService = ReturnType<typeof createSecurityAlertService>;

/**
 * Detects one anomaly pattern derivable from EXISTING audit data,
 * without any new read/access instrumentation: a single actor whose
 * mutation events touched an unusually large number of distinct
 * entities within a short rolling window. This is a MUTATION-volume
 * signal (creates/updates already logged today) — not a page-view or
 * record-read signal, since reads are not currently audited.
 */
const WINDOW_HOURS = 1;
const DISTINCT_ENTITY_THRESHOLD = 50;

export function createSecurityAlertService(database: DB) {
  return {
    scan: async () => {
      const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);
      const windowEnd = new Date();
      const grouped = await database
        .select({ actorId: auditEvents.actorId, actorEmail: auditEvents.actorEmail, clinicId: auditEvents.clinicId, distinctEntities: countDistinct(auditEvents.entityId) })
        .from(auditEvents)
        .where(and(isNotNull(auditEvents.actorId), gte(auditEvents.createdAt, windowStart)))
        .groupBy(auditEvents.actorId, auditEvents.actorEmail, auditEvents.clinicId)
        .having(gt(countDistinct(auditEvents.entityId), DISTINCT_ENTITY_THRESHOLD));

      const created = [];
      for (const row of grouped) {
        const [existingOpen] = await database.select({ id: securityAlerts.id }).from(securityAlerts).where(and(eq(securityAlerts.actorId, row.actorId!), eq(securityAlerts.alertType, 'bulk_mutation_volume'), eq(securityAlerts.status, 'open'))).limit(1);
        if (existingOpen) continue;
        const [alert] = await database.insert(securityAlerts).values({
          alertType: 'bulk_mutation_volume',
          actorId: row.actorId,
          actorEmail: row.actorEmail,
          clinicId: row.clinicId,
          severity: row.distinctEntities > DISTINCT_ENTITY_THRESHOLD * 2 ? 'critical' : 'warning',
          details: `${row.distinctEntities} distinct entities mutated by this actor within ${WINDOW_HOURS}h (threshold: ${DISTINCT_ENTITY_THRESHOLD})`,
          windowStart,
          windowEnd,
        }).returning();
        await writeAudit(database, { actorId: null, clinicId: row.clinicId, entityType: 'security_alert', entityId: alert.id, action: AuditAction.SECURITY_ALERT_RAISED, metadata: JSON.stringify({ alertType: 'bulk_mutation_volume', subjectActorId: row.actorId, distinctEntities: row.distinctEntities }) });
        created.push(alert);
      }
      return { raised: created.length };
    },

    list: async (status?: 'open' | 'acknowledged' | 'dismissed') => database
      .select({ id: securityAlerts.id, alertType: securityAlerts.alertType, actorId: securityAlerts.actorId, actorEmail: securityAlerts.actorEmail, actorName: users.name, clinicId: securityAlerts.clinicId, severity: securityAlerts.severity, details: securityAlerts.details, windowStart: securityAlerts.windowStart, windowEnd: securityAlerts.windowEnd, status: securityAlerts.status, createdAt: securityAlerts.createdAt })
      .from(securityAlerts)
      .leftJoin(users, eq(users.id, securityAlerts.actorId))
      .where(status ? eq(securityAlerts.status, status) : undefined)
      .orderBy(securityAlerts.createdAt),

    resolve: async (alertId: string, resolution: 'acknowledged' | 'dismissed', actor: SecurityAlertActor) => database.transaction(async (tx) => {
      const [alert] = await tx.select().from(securityAlerts).where(and(eq(securityAlerts.id, alertId), eq(securityAlerts.status, 'open'))).limit(1).for('update');
      if (!alert) throw new SecurityAlertError('ALERT_NOT_FOUND', 'Open security alert not found', 404);
      const [updated] = await tx.update(securityAlerts).set({ status: resolution, acknowledgedBy: actor.id, acknowledgedAt: new Date() }).where(eq(securityAlerts.id, alertId)).returning();
      await writeAudit(tx, { actorId: actor.id, actorEmail: actor.email, clinicId: alert.clinicId, entityType: 'security_alert', entityId: alertId, action: AuditAction.SECURITY_ALERT_RESOLVED, metadata: JSON.stringify({ resolution }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return updated;
    }),
  };
}
