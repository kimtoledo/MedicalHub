import { and, count, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { clinics, notificationOutbox } from '@dentra/db/schema';

export type EmailLogFilters = {
  search: string;
  status?: typeof notificationOutbox.$inferSelect.status;
  type?: typeof notificationOutbox.$inferSelect.type;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
};

export type AdminEmailLogsService = ReturnType<typeof createAdminEmailLogsService>;

export function createAdminEmailLogsService(database: DB) {
  const selection = {
    id: notificationOutbox.id,
    clinicId: notificationOutbox.clinicId,
    clinicName: clinics.name,
    channel: notificationOutbox.channel,
    type: notificationOutbox.type,
    recipient: notificationOutbox.recipient,
    subject: notificationOutbox.subject,
    status: notificationOutbox.status,
    attempts: notificationOutbox.attempts,
    nextAttemptAt: notificationOutbox.nextAttemptAt,
    lastError: notificationOutbox.lastError,
    sentAt: notificationOutbox.sentAt,
    createdAt: notificationOutbox.createdAt,
    updatedAt: notificationOutbox.updatedAt,
  };

  return {
    list: async (filters: EmailLogFilters) => {
      const term = filters.search.trim() ? `%${filters.search.trim()}%` : undefined;
      const where = and(
        eq(notificationOutbox.channel, 'email'),
        filters.status ? eq(notificationOutbox.status, filters.status) : undefined,
        filters.type ? eq(notificationOutbox.type, filters.type) : undefined,
        filters.dateFrom ? gte(notificationOutbox.createdAt, filters.dateFrom) : undefined,
        filters.dateTo ? lte(notificationOutbox.createdAt, filters.dateTo) : undefined,
        term ? or(ilike(notificationOutbox.recipient, term), ilike(notificationOutbox.subject, term), ilike(clinics.name, term)) : undefined,
      );
      const [items, [total]] = await Promise.all([
        database.select(selection)
          .from(notificationOutbox)
          .leftJoin(clinics, eq(clinics.id, notificationOutbox.clinicId))
          .where(where)
          .orderBy(desc(notificationOutbox.createdAt))
          .limit(filters.pageSize)
          .offset((filters.page - 1) * filters.pageSize),
        database.select({ value: count() })
          .from(notificationOutbox)
          .leftJoin(clinics, eq(clinics.id, notificationOutbox.clinicId))
          .where(where),
      ]);
      const totalItems = total?.value ?? 0;
      return {
        items: items.map((item) => ({ ...item, attempts: Number(item.attempts) || 0, source: item.clinicId ? 'clinic' as const : 'platform' as const })),
        pagination: { page: filters.page, pageSize: filters.pageSize, total: totalItems, totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)) },
      };
    },

    get: async (id: string) => {
      const [row] = await database.select({ ...selection, body: notificationOutbox.body, dedupeKey: notificationOutbox.dedupeKey })
        .from(notificationOutbox)
        .leftJoin(clinics, eq(clinics.id, notificationOutbox.clinicId))
        .where(and(eq(notificationOutbox.id, id), eq(notificationOutbox.channel, 'email')))
        .limit(1);
      return row ? { ...row, attempts: Number(row.attempts) || 0, source: row.clinicId ? 'clinic' as const : 'platform' as const } : null;
    },
  };
}
