import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { requireClinicFeature } from '../clinic/access.js';
import type { AuthServices, ClinicRole } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import type { ClinicAnalyticsService } from '../clinic/analytics-service.js';
import { postgresUuidSchema } from '../validation.js';
const params = z.object({ clinicId: postgresUuidSchema }); const query = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }); const roles: readonly ClinicRole[] = ['clinic_owner', 'clinic_admin', 'dentist'];
export async function registerClinicAnalyticsRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService; analytics: ClinicAnalyticsService }) { app.get('/v1/clinic/:clinicId/analytics', async (request, reply) => { const p = params.safeParse(request.params); const q = query.safeParse(request.query); if (!p.success || !q.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Analytics date range is required' } }); if (!await requireClinicFeature(request, reply, options, p.data.clinicId, FeatureKey.REPORTS_ADVANCED, [...roles])) return; return reply.send({ success: true, data: await options.analytics.summary(p.data.clinicId, { from: new Date(`${q.data.from}T00:00:00+08:00`), to: new Date(`${q.data.to}T23:59:59+08:00`) }) }); }); }
