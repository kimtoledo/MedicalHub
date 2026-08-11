import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import type { AdminClinicListService } from '../admin/clinics-service.js';

const listClinicsQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  status: z.enum(['trial', 'active', 'suspended', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

type RegisterAdminClinicRoutesOptions = {
  auth: AuthServices;
  clinics: AdminClinicListService;
};

export async function registerAdminClinicRoutes(
  app: FastifyInstance,
  options: RegisterAdminClinicRoutesOptions,
): Promise<void> {
  app.get('/v1/admin/clinics', async (request, reply) => {
    const authorization = await resolveRequestAuthorization(request, options.auth);

    if (!authorization) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'A valid session is required',
        },
      });
    }

    if (!isSuperAdmin(authorization)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Super Admin access is required',
        },
      });
    }

    const query = listClinicsQuerySchema.safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid clinic list filters',
        },
      });
    }

    const result = await options.clinics.list(query.data);

    return reply.send({ success: true, data: result });
  });
}
