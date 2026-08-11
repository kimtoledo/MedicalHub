import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AdminSubscriptionListService } from '../admin/subscriptions-service.js';
import { isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';

const querySchema = z.object({
  search: z.string().trim().max(100).default(''),
  status: z.enum(['trial', 'active', 'past_due', 'cancelled', 'expired']).optional(),
  packageId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export async function registerAdminSubscriptionRoutes(app: FastifyInstance, options: { auth: AuthServices; subscriptions: AdminSubscriptionListService }) {
  app.get('/v1/admin/subscriptions', async (request, reply) => {
    const auth = await resolveRequestAuthorization(request, options.auth);
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(auth)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } });
    const query = querySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid subscription filters' } });
    return reply.send({ success: true, data: await options.subscriptions.list(query.data) });
  });
}
