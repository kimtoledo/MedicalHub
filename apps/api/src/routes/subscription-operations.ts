import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CapacityMetric } from '@dentra/shared';
import { isSuperAdmin, hasClinicAccess } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import type { AdminClinicSettingsService } from '../admin/clinic-settings-service.js';
import { postgresUuidSchema } from '../validation.js';
import { SubscriptionOperationsError, type SubscriptionOperationsService } from '../clinic/subscription-operations-service.js';
const clinicParams = z.object({ clinicId: postgresUuidSchema });
const requestParams = z.object({ requestId: postgresUuidSchema });
const capacityMetricValues = Object.values(CapacityMetric) as [CapacityMetric, ...CapacityMetric[]];
const requestBody = z.object({ type: z.enum(['upgrade', 'downgrade', 'addon']), requestedPackageId: postgresUuidSchema.optional(), requestedMetric: z.enum(capacityMetricValues).optional(), requestedLimit: z.number().int().min(0).nullable().optional(), reason: z.string().trim().min(3).max(1000) }).strict();
const reviewBody = z.object({ status: z.enum(['approved', 'rejected']), note: z.string().trim().min(3).max(1000) }).strict();
const period = z.object({ periodKey: z.string().regex(/^\d{4}-(?:\d{2}|all)$/).default('all') });
const actor = (request: FastifyRequest, auth: { user: { id: string; email: string } }) => ({ id: auth.user.id, email: auth.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
const error = (reply: any, caught: unknown) => { if (caught instanceof SubscriptionOperationsError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; };
export async function registerSubscriptionOperationRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService; operations: SubscriptionOperationsService; adminSettings: AdminClinicSettingsService }) {
  app.get('/v1/clinic/:clinicId/subscription', async (request, reply) => { const params = clinicParams.safeParse(request.params); if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic identifier' } }); const auth = await resolveRequestAuthorization(request, options.auth); if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } }); if (!hasClinicAccess(auth, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access is required' } }); const entitlement = await options.entitlements.resolve(params.data.clinicId); const requests = await options.operations.listRequests(params.data.clinicId); const capacity = await options.operations.capacitySummary(params.data.clinicId); return reply.send({ success: true, data: { entitlement, requests, capacity } }); });
  app.post('/v1/clinic/:clinicId/subscription/requests', async (request, reply) => { const params = clinicParams.safeParse(request.params); const body = requestBody.safeParse(request.body); if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid subscription request' } }); const auth = await resolveRequestAuthorization(request, options.auth); if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } }); if (!hasClinicAccess(auth, params.data.clinicId, ['clinic_owner', 'clinic_admin'])) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic administrator access is required' } }); try { return reply.status(201).send({ success: true, data: await options.operations.createRequest(params.data.clinicId, body.data, actor(request, auth)) }); } catch (caught) { return error(reply, caught); } });
  app.get('/v1/clinic/:clinicId/usage', async (request, reply) => { const params = clinicParams.safeParse(request.params); const query = period.safeParse(request.query); if (!params.success || !query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid usage request' } }); const auth = await resolveRequestAuthorization(request, options.auth); if (!auth || !hasClinicAccess(auth, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access is required' } }); return reply.send({ success: true, data: await options.operations.usage(params.data.clinicId, query.data.periodKey) }); });
  app.get('/v1/admin/subscription-requests', async (request, reply) => { const auth = await resolveRequestAuthorization(request, options.auth); if (!auth || !isSuperAdmin(auth)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } }); return reply.send({ success: true, data: await options.operations.listPending() }); });
  app.patch('/v1/admin/subscription-requests/:requestId', async (request, reply) => { const params = requestParams.safeParse(request.params); const body = reviewBody.safeParse(request.body); const auth = await resolveRequestAuthorization(request, options.auth); if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid review request' } }); if (!auth || !isSuperAdmin(auth)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } }); try {
    const reviewed = await options.operations.reviewRequest(params.data.requestId, body.data, actor(request, auth));
    if (body.data.status === 'approved' && reviewed.requestedPackageId) {
      await options.adminSettings.assignPackage(reviewed.clinicId, { packageId: reviewed.requestedPackageId, effectiveAt: new Date() }, actor(request, auth));
    }
    if (body.data.status === 'approved' && reviewed.type === 'addon' && reviewed.requestedMetric && reviewed.requestedLimit != null) {
      await options.adminSettings.setLimitOverride(
        reviewed.clinicId,
        { metric: reviewed.requestedMetric as CapacityMetric, limit: reviewed.requestedLimit, reason: `Approved add-on request ${reviewed.id}`, expiresAt: null },
        actor(request, auth),
      );
    }
    return reply.send({ success: true, data: reviewed });
  } catch (caught) { return error(reply, caught); } });
}
