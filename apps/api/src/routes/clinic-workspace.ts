import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuthServices } from '../auth/types.js';
import { getClinicAccess } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { ClinicWorkspaceService } from '../clinic/workspace-service.js';
import { postgresUuidSchema } from '../validation.js';

const paramsSchema = z.object({ clinicId: postgresUuidSchema });
export async function registerClinicWorkspaceRoutes(app: FastifyInstance, options: { auth: AuthServices; workspace: ClinicWorkspaceService }) {
  app.get('/v1/clinic/:clinicId/context', async (request, reply) => {
    const authorization = await resolveRequestAuthorization(request, options.auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic identifier' } });
    const memberships = getClinicAccess(authorization, params.data.clinicId);
    if (!memberships.length) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access is required' } });
    const clinicWide = memberships.some((item) => item.branchId === null);
    const allowedBranchIds = clinicWide ? null : Array.from(new Set(memberships.flatMap((item) => item.branchId ? [item.branchId] : [])));
    const context = await options.workspace.get(params.data.clinicId, allowedBranchIds);
    if (!context) return reply.status(404).send({ success: false, error: { code: 'CLINIC_NOT_FOUND', message: 'Clinic not found' } });
    return reply.send({ success: true, data: context });
  });
}
