import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { requireClinicFeature } from '../clinic/access.js';
import type { AuthServices, ClinicRole } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import type { ClinicReportsService } from '../clinic/reports-service.js';
import { postgresUuidSchema } from '../validation.js';

const params = z.object({ clinicId: postgresUuidSchema, report: z.enum(['filters', 'operational', 'financial', 'inventory']) });
const query = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), format: z.enum(['json', 'csv']).default('json'),
  branchId: postgresUuidSchema.optional(), dentistId: postgresUuidSchema.optional(), serviceId: postgresUuidSchema.optional(),
  status: z.enum(['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']).optional(),
  paymentMethod: z.enum(['cash', 'gcash', 'card', 'bank_transfer', 'other']).optional(),
}).refine((value) => (!value.from && !value.to) || Boolean(value.from && value.to && value.from <= value.to), 'A valid date range is required');
const roleMap: Record<'filters' | 'operational' | 'financial' | 'inventory', readonly ClinicRole[]> = {
  filters: ['clinic_owner', 'clinic_admin', 'dentist', 'cashier', 'inventory_staff'], operational: ['clinic_owner', 'clinic_admin', 'dentist'], financial: ['clinic_owner', 'clinic_admin', 'cashier'], inventory: ['clinic_owner', 'clinic_admin', 'inventory_staff'],
};
const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
function csv(report: string, data: any) {
  const rows: Record<string, unknown>[] = report === 'operational' ? data.details : report === 'financial' ? data.details : data;
  const headers = report === 'operational' ? ['startsAt', 'status', 'branch', 'dentist', 'service'] : report === 'financial' ? ['paymentDate', 'invoiceNumber', 'branch', 'paymentMethod', 'amountPhp'] : ['name', 'category', 'unit', 'reorderLevel', 'currentStock'];
  return `${headers.map(escape).join(',')}\n${rows.map((row) => headers.map((header) => escape(row[header])).join(',')).join('\n')}\n`;
}

export async function registerClinicReportsRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService; db?: import('@dentra/db').DB; reports: ClinicReportsService }) {
  app.get('/v1/clinic/:clinicId/reports/:report', async (request, reply) => {
    const parsedParams = params.safeParse(request.params); const parsedQuery = query.safeParse(request.query);
    if (!parsedParams.success || !parsedQuery.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid report request' } });
    const { clinicId, report } = parsedParams.data;
    if (!await requireClinicFeature(request, reply, options, clinicId, FeatureKey.REPORTS_BASIC, [...roleMap[report]])) return;
    if (report === 'filters') return reply.send({ success: true, data: await options.reports.filters(clinicId) });
    if (!parsedQuery.data.from || !parsedQuery.data.to) return reply.status(400).send({ success: false, error: { code: 'DATE_RANGE_REQUIRED', message: 'Report dates are required' } });
    const range = { from: new Date(`${parsedQuery.data.from}T00:00:00+08:00`), to: new Date(`${parsedQuery.data.to}T23:59:59.999+08:00`) };
    const filters = { branchId: parsedQuery.data.branchId, dentistId: parsedQuery.data.dentistId, status: parsedQuery.data.status, serviceId: parsedQuery.data.serviceId, paymentMethod: parsedQuery.data.paymentMethod };
    const data = report === 'inventory' ? await options.reports.inventory(clinicId) : report === 'financial' ? await options.reports.financial(clinicId, range, filters) : await options.reports.operational(clinicId, range, filters);
    if (parsedQuery.data.format === 'csv') return reply.header('content-type', 'text/csv; charset=utf-8').header('content-disposition', `attachment; filename="dentra-${report}-${parsedQuery.data.from}-${parsedQuery.data.to}.csv"`).send(csv(report, data));
    return reply.send({ success: true, data });
  });
}
