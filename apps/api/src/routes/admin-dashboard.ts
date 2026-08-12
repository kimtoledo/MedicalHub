import type { FastifyInstance } from 'fastify';
import type { AdminDashboardService } from '../admin/dashboard-service.js';
import { isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';

export async function registerAdminDashboardRoutes(app: FastifyInstance, options: { auth: AuthServices; dashboard: AdminDashboardService }) {
  app.get('/v1/admin/dashboard', async (request, reply) => {
    const auth = await resolveRequestAuthorization(request, options.auth);
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(auth)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } });
    return reply.send({ success: true, data: await options.dashboard.get() });
  });
}
