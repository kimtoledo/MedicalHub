import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { requireClinicFeature } from '../clinic/access.js';
import { getClinicAccess } from '../auth/authorization.js';
import type { AuthServices, ClinicRole } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import type { ClinicAnalyticsService } from '../clinic/analytics-service.js';
import { postgresUuidSchema } from '../validation.js';

const params = z.object({ clinicId: postgresUuidSchema });
const query = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), branchId: postgresUuidSchema.optional(), format: z.enum(['json', 'csv']).default('json') }).refine((value) => value.from <= value.to, 'Start date must be on or before end date').refine((value) => Date.parse(`${value.to}T00:00:00Z`) - Date.parse(`${value.from}T00:00:00Z`) <= 366 * 86_400_000, 'Analytics range cannot exceed 366 days');
const roles: readonly ClinicRole[] = ['clinic_owner', 'clinic_admin', 'dentist'];
const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
function csv(data: Awaited<ReturnType<ClinicAnalyticsService['summary']>>) {
  const rows = [
    ...data.trends.appointments.map((row) => ({ series: `appointments.${row.status}`, day: row.day, value: row.total })),
    ...data.trends.revenue.map((row) => ({ series: 'revenue_php', day: row.day, value: row.revenuePhp })),
    { series: 'conversion_rate', day: '', value: data.conversionRate }, { series: 'no_show_rate', day: '', value: data.noShowRate }, { series: 'cancellation_rate', day: '', value: data.cancellationRate }, { series: 'treatment_acceptance_rate', day: '', value: data.treatmentAcceptanceRate },
  ];
  return `"series","day","value"\n${rows.map((row) => [row.series, row.day, row.value].map(escape).join(',')).join('\n')}\n`;
}

export async function registerClinicAnalyticsRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService; analytics: ClinicAnalyticsService }) {
  app.get('/v1/clinic/:clinicId/analytics', async (request, reply) => {
    const parsedParams = params.safeParse(request.params); const parsedQuery = query.safeParse(request.query);
    if (!parsedParams.success || !parsedQuery.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsedQuery.success ? 'Invalid clinic' : parsedQuery.error.issues[0]?.message ?? 'Analytics date range is required' } });
    const authorization = await requireClinicFeature(request, reply, options, parsedParams.data.clinicId, FeatureKey.REPORTS_ADVANCED, [...roles]);
    if (!authorization) return;
    const access = getClinicAccess(authorization, parsedParams.data.clinicId).filter((item) => roles.includes(item.role));
    const clinicWide = access.some((item) => item.branchId === null);
    const allowedBranches = clinicWide ? null : [...new Set(access.flatMap((item) => item.branchId ? [item.branchId] : []))];
    if (parsedQuery.data.branchId && allowedBranches && !allowedBranches.includes(parsedQuery.data.branchId)) return reply.status(403).send({ success: false, error: { code: 'BRANCH_FORBIDDEN', message: 'The selected branch is outside your assigned scope' } });
    const branchIds = parsedQuery.data.branchId ? [parsedQuery.data.branchId] : allowedBranches;
    const includeRevenue = access.some((item) => ['clinic_owner', 'clinic_admin'].includes(item.role));
    const data = await options.analytics.summary(parsedParams.data.clinicId, { from: new Date(`${parsedQuery.data.from}T00:00:00+08:00`), to: new Date(`${parsedQuery.data.to}T23:59:59.999+08:00`) }, { branchIds, includeRevenue });
    if (parsedQuery.data.format === 'csv') return reply.header('content-type', 'text/csv; charset=utf-8').header('content-disposition', `attachment; filename="dentra-advanced-analytics-${parsedQuery.data.from}-${parsedQuery.data.to}.csv"`).send(csv(data));
    return reply.send({ success: true, data });
  });
}
