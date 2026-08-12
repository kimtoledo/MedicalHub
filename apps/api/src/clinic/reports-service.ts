import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { appointments, branches, dentistBranchAssignments, dentists, invoiceLineItems, invoicePayments, invoices, inventoryItems, inventoryTransactions, patients, services } from '@dentra/db/schema';

export type ReportRange = { from: Date; to: Date };
export type ReportFilters = { branchId?: string; dentistId?: string; status?: typeof appointments.$inferSelect.status; serviceId?: string; paymentMethod?: typeof invoicePayments.$inferSelect.paymentMethod };

export function createClinicReportsService(database: DB) { return {
  filters: async (clinicId: string) => {
    const [branchRows, dentistRows, serviceRows] = await Promise.all([
      database.select({ id: branches.id, name: branches.name }).from(branches).where(and(eq(branches.clinicId, clinicId), eq(branches.isActive, true))).orderBy(asc(branches.name)),
      database.selectDistinct({ id: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName }).from(dentistBranchAssignments).innerJoin(dentists, eq(dentistBranchAssignments.dentistId, dentists.id)).where(and(eq(dentistBranchAssignments.clinicId, clinicId), eq(dentistBranchAssignments.isActive, 'true'))).orderBy(asc(dentists.lastName), asc(dentists.firstName)),
      database.select({ id: services.id, name: services.name }).from(services).where(and(eq(services.clinicId, clinicId), eq(services.isActive, 'true'))).orderBy(asc(services.name)),
    ]);
    return { branches: branchRows, dentists: dentistRows.map((item) => ({ id: item.id, name: `${item.firstName} ${item.lastName}` })), services: serviceRows };
  },
  operational: async (clinicId: string, range: ReportRange, filters: ReportFilters) => {
    const where = and(eq(appointments.clinicId, clinicId), gte(appointments.startsAt, range.from), lte(appointments.startsAt, range.to), filters.branchId ? eq(appointments.branchId, filters.branchId) : undefined, filters.dentistId ? eq(appointments.dentistId, filters.dentistId) : undefined, filters.status ? eq(appointments.status, filters.status) : undefined, filters.serviceId ? eq(appointments.serviceId, filters.serviceId) : undefined);
    const [byStatus, byDentist, byService, details, registered] = await Promise.all([
      database.select({ status: appointments.status, count: sql<number>`count(*)::int` }).from(appointments).where(where).groupBy(appointments.status),
      database.select({ dentistId: appointments.dentistId, dentist: sql<string>`coalesce(${dentists.firstName} || ' ' || ${dentists.lastName}, 'Unassigned')`, count: sql<number>`count(*)::int` }).from(appointments).leftJoin(dentists, eq(appointments.dentistId, dentists.id)).where(where).groupBy(appointments.dentistId, dentists.firstName, dentists.lastName).orderBy(sql`count(*) desc`),
      database.select({ serviceId: appointments.serviceId, service: sql<string>`coalesce(${services.name}, 'Unspecified')`, count: sql<number>`count(*)::int` }).from(appointments).leftJoin(services, eq(appointments.serviceId, services.id)).where(where).groupBy(appointments.serviceId, services.name).orderBy(sql`count(*) desc`),
      database.select({ id: appointments.id, startsAt: appointments.startsAt, status: appointments.status, branch: branches.name, dentist: sql<string>`coalesce(${dentists.firstName} || ' ' || ${dentists.lastName}, 'Unassigned')`, service: sql<string>`coalesce(${services.name}, 'Unspecified')` }).from(appointments).innerJoin(branches, eq(appointments.branchId, branches.id)).leftJoin(dentists, eq(appointments.dentistId, dentists.id)).leftJoin(services, eq(appointments.serviceId, services.id)).where(where).orderBy(appointments.startsAt).limit(500),
      database.select({ count: sql<number>`count(*)::int` }).from(patients).where(and(eq(patients.clinicId, clinicId), gte(patients.createdAt, range.from), lte(patients.createdAt, range.to))),
    ]);
    return { byStatus, byDentist, byService, details, patientsRegistered: registered[0]?.count ?? 0 };
  },
  financial: async (clinicId: string, range: ReportRange, filters: ReportFilters) => {
    const paymentWhere = and(eq(invoicePayments.clinicId, clinicId), gte(invoicePayments.createdAt, range.from), lte(invoicePayments.createdAt, range.to), filters.paymentMethod ? eq(invoicePayments.paymentMethod, filters.paymentMethod) : undefined, filters.branchId ? eq(invoices.branchId, filters.branchId) : undefined);
    const invoiceWhere = and(eq(invoices.clinicId, clinicId), gte(invoices.createdAt, range.from), lte(invoices.createdAt, range.to), filters.branchId ? eq(invoices.branchId, filters.branchId) : undefined);
    const [byMethod, outstanding, byService, details] = await Promise.all([
      database.select({ paymentMethod: invoicePayments.paymentMethod, totalPhp: sql<string>`coalesce(sum(${invoicePayments.amountPhp}), 0)::numeric` }).from(invoicePayments).innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id)).where(paymentWhere).groupBy(invoicePayments.paymentMethod),
      database.select({ totalPhp: sql<string>`coalesce(sum(${invoices.totalAmountPhp}), 0)::numeric` }).from(invoices).where(and(invoiceWhere, eq(invoices.status, 'pending'))),
      database.select({ serviceId: invoiceLineItems.serviceId, service: invoiceLineItems.description, quantity: sql<number>`coalesce(sum(${invoiceLineItems.quantity}), 0)::int`, totalPhp: sql<string>`coalesce(sum(${invoiceLineItems.totalPhp}), 0)::numeric` }).from(invoiceLineItems).innerJoin(invoices, eq(invoiceLineItems.invoiceId, invoices.id)).where(and(invoiceWhere, filters.serviceId ? eq(invoiceLineItems.serviceId, filters.serviceId) : undefined)).groupBy(invoiceLineItems.serviceId, invoiceLineItems.description).orderBy(sql`sum(${invoiceLineItems.totalPhp}) desc`),
      database.select({ id: invoicePayments.id, invoiceNumber: invoices.invoiceNumber, paymentDate: invoicePayments.paymentDate, paymentMethod: invoicePayments.paymentMethod, amountPhp: invoicePayments.amountPhp, branch: branches.name }).from(invoicePayments).innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id)).innerJoin(branches, eq(invoices.branchId, branches.id)).where(paymentWhere).orderBy(invoicePayments.paymentDate).limit(500),
    ]);
    return { byMethod, byService, details, outstandingPhp: outstanding[0]?.totalPhp ?? '0' };
  },
  inventory: async (clinicId: string) => database.select({ itemId: inventoryItems.id, name: inventoryItems.name, category: inventoryItems.category, unit: inventoryItems.unit, reorderLevel: inventoryItems.reorderLevel, currentStock: sql<string>`coalesce(sum(case when ${inventoryTransactions.direction} = 'out' then -${inventoryTransactions.quantity} else ${inventoryTransactions.quantity} end), 0)::numeric` }).from(inventoryItems).leftJoin(inventoryTransactions, and(eq(inventoryTransactions.itemId, inventoryItems.id), eq(inventoryTransactions.clinicId, clinicId))).where(eq(inventoryItems.clinicId, clinicId)).groupBy(inventoryItems.id).orderBy(asc(inventoryItems.name)),
}; }
export type ClinicReportsService = ReturnType<typeof createClinicReportsService>;
