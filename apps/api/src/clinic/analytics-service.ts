import { and, count, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { appointments, invoices, treatmentPlanItems } from '@dentra/db/schema';

export type AnalyticsRange = { from: Date; to: Date };
export type AnalyticsOptions = { branchIds: string[] | null; includeRevenue: boolean };
export type ClinicAnalyticsService = ReturnType<typeof createClinicAnalyticsService>;

export function createClinicAnalyticsService(database: DB) {
  return {
    summary: async (clinicId: string, range: AnalyticsRange, options: AnalyticsOptions = { branchIds: null, includeRevenue: true }) => {
      const appointmentScope = and(eq(appointments.clinicId, clinicId), gte(appointments.startsAt, range.from), lte(appointments.startsAt, range.to), options.branchIds ? inArray(appointments.branchId, options.branchIds) : undefined);
      const revenueScope = and(eq(invoices.clinicId, clinicId), gte(invoices.createdAt, range.from), lte(invoices.createdAt, range.to), options.branchIds ? inArray(invoices.branchId, options.branchIds) : undefined);
      const [statusRows, revenueRows, planRows] = await Promise.all([
        database.select({ day: sql<string>`to_char(${appointments.startsAt} at time zone 'Asia/Manila', 'YYYY-MM-DD')`, status: appointments.status, total: count(appointments.id) }).from(appointments).where(appointmentScope).groupBy(sql`1`, appointments.status).orderBy(sql`1`),
        options.includeRevenue ? database.select({ day: sql<string>`to_char(${invoices.createdAt} at time zone 'Asia/Manila', 'YYYY-MM-DD')`, revenuePhp: sql<string>`coalesce(sum(${invoices.totalAmountPhp}),0)::numeric` }).from(invoices).where(revenueScope).groupBy(sql`1`).orderBy(sql`1`) : Promise.resolve([]),
        options.branchIds === null ? database.select({ status: treatmentPlanItems.status, total: count(treatmentPlanItems.id) }).from(treatmentPlanItems).where(and(eq(treatmentPlanItems.clinicId, clinicId), gte(treatmentPlanItems.createdAt, range.from), lte(treatmentPlanItems.createdAt, range.to))).groupBy(treatmentPlanItems.status) : Promise.resolve([]),
      ]);
      const total = statusRows.reduce((sum, row) => sum + Number(row.total), 0);
      const completed = statusRows.filter((row) => row.status === 'completed').reduce((sum, row) => sum + Number(row.total), 0);
      const noShows = statusRows.filter((row) => row.status === 'no_show').reduce((sum, row) => sum + Number(row.total), 0);
      const cancelled = statusRows.filter((row) => row.status === 'cancelled').reduce((sum, row) => sum + Number(row.total), 0);
      const proposed = planRows.reduce((sum, row) => sum + Number(row.total), 0);
      const accepted = planRows.filter((row) => ['accepted', 'scheduled', 'in_progress', 'completed'].includes(row.status)).reduce((sum, row) => sum + Number(row.total), 0);
      return { range, trends: { appointments: statusRows, revenue: revenueRows }, conversionRate: total ? completed / total : 0, noShowRate: total ? noShows / total : 0, cancellationRate: total ? cancelled / total : 0, treatmentAcceptanceRate: options.branchIds === null ? (proposed ? accepted / proposed : 0) : null, revenueVisible: options.includeRevenue };
    },
  };
}
