import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { requireClinicFeature } from '../clinic/access.js';
import type { AuthServices, ClinicRole } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import type { ClinicReportsService } from '../clinic/reports-service.js';
import { postgresUuidSchema } from '../validation.js';
const params = z.object({ clinicId: postgresUuidSchema, report: z.enum(['operational', 'financial', 'inventory']) });
const query = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default('2020-01-01'), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default('2099-12-31'), format: z.enum(['json', 'csv']).default('json') });
const roles: readonly ClinicRole[] = ['clinic_owner', 'clinic_admin', 'dentist'];
function csv(value: unknown) { const rows = Array.isArray(value) ? value : Object.entries(value as Record<string, unknown>).map(([key, item]) => ({ key, value: typeof item === 'object' ? JSON.stringify(item) : item })); const headers = Object.keys((rows[0] ?? { key: '', value: '' })); return `${headers.join(',')}\n${rows.map((row) => headers.map((header) => JSON.stringify((row as Record<string, unknown>)[header] ?? '')).join(',')).join('\n')}`; }
export async function registerClinicReportsRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService; reports: ClinicReportsService }) { app.get('/v1/clinic/:clinicId/reports/:report', async (request, reply) => { const parsedParams = params.safeParse(request.params); const parsedQuery = query.safeParse(request.query); if (!parsedParams.success || !parsedQuery.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid report request' } }); const auth = await requireClinicFeature(request, reply, options, parsedParams.data.clinicId, FeatureKey.REPORTS_BASIC, [...roles]); if (!auth) return; const range = { from: new Date(`${parsedQuery.data.from}T00:00:00+08:00`), to: new Date(`${parsedQuery.data.to}T23:59:59+08:00`) }; const data = parsedParams.data.report === 'inventory' ? await options.reports.inventory(parsedParams.data.clinicId) : parsedParams.data.report === 'financial' ? await options.reports.financial(parsedParams.data.clinicId, range) : await options.reports.operational(parsedParams.data.clinicId, range); if (parsedQuery.data.format === 'csv') return reply.header('content-type', 'text/csv; charset=utf-8').send(csv(data)); return reply.send({ success: true, data }); }); }
