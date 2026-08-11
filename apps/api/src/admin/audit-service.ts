import { and, count, desc, eq, gte, ilike, lt } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { auditEvents, clinics } from '@dentra/db/schema';

export type ListAdminAuditInput = {
  actor: string;
  action?: string;
  dateFrom?: Date;
  dateToExclusive?: Date;
  page: number;
  pageSize: number;
};

export type AdminAuditListResult = {
  items: Array<{
    id: string;
    actorId: string | null;
    actorEmail: string | null;
    clinicId: string | null;
    clinicName: string | null;
    entityType: string;
    entityId: string | null;
    action: string;
    metadata: string | null;
    ipAddress: string | null;
    occurredAt: Date;
  }>;
  actionOptions: string[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AdminAuditService = {
  list: (input: ListAdminAuditInput) => Promise<AdminAuditListResult>;
};

export function createAdminAuditService(database: DB): AdminAuditService {
  return {
    list: async (input) => {
      const where = and(
        input.actor
          ? ilike(auditEvents.actorEmail, `%${input.actor.trim()}%`)
          : undefined,
        input.action ? eq(auditEvents.action, input.action) : undefined,
        input.dateFrom ? gte(auditEvents.occurredAt, input.dateFrom) : undefined,
        input.dateToExclusive
          ? lt(auditEvents.occurredAt, input.dateToExclusive)
          : undefined,
      );

      const [totalRows, actionRows] = await Promise.all([
        database
          .select({ total: count(auditEvents.id) })
          .from(auditEvents)
          .where(where),
        database
          .selectDistinct({ action: auditEvents.action })
          .from(auditEvents)
          .orderBy(auditEvents.action),
      ]);
      const total = totalRows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
      const page = Math.min(input.page, totalPages);

      const items = await database
        .select({
          id: auditEvents.id,
          actorId: auditEvents.actorId,
          actorEmail: auditEvents.actorEmail,
          clinicId: auditEvents.clinicId,
          clinicName: clinics.name,
          entityType: auditEvents.entityType,
          entityId: auditEvents.entityId,
          action: auditEvents.action,
          metadata: auditEvents.metadata,
          ipAddress: auditEvents.ipAddress,
          occurredAt: auditEvents.occurredAt,
        })
        .from(auditEvents)
        .leftJoin(clinics, eq(auditEvents.clinicId, clinics.id))
        .where(where)
        .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
        .limit(input.pageSize)
        .offset((page - 1) * input.pageSize);

      return {
        items,
        actionOptions: actionRows.map((row) => row.action),
        pagination: { page, pageSize: input.pageSize, total, totalPages },
      };
    },
  };
}
