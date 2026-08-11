import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { EntitlementService } from '../entitlements/service.js';
import { hasClinicAccess, isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import { postgresUuidSchema } from '../validation.js';

const paramsSchema = z.object({ clinicId: postgresUuidSchema });
export async function registerEntitlementRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService }) {
  app.get('/v1/entitlements/:clinicId', async (request, reply) => {
    const authorization = await resolveRequestAuthorization(request, options.auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic identifier' } });
    if (!isSuperAdmin(authorization) && !hasClinicAccess(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access is required' } });
    const result = await options.entitlements.resolve(params.data.clinicId);
    if (!result) return reply.status(404).send({ success: false, error: { code: 'CLINIC_NOT_FOUND', message: 'Clinic not found' } });
    return reply.send({ success: true, data: result });
  });
}
