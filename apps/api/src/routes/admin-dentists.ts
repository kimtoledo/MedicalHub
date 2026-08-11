import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AdminDentistListService } from '../admin/dentists-service.js';
import { isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';

const listDentistsQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  verificationStatus: z
    .enum(['unverified', 'pending', 'verified'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

type RegisterAdminDentistRoutesOptions = {
  auth: AuthServices;
  dentists: AdminDentistListService;
};

export async function registerAdminDentistRoutes(
  app: FastifyInstance,
  options: RegisterAdminDentistRoutesOptions,
): Promise<void> {
  app.get('/v1/admin/dentists', async (request, reply) => {
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

    const query = listDentistsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid dentist list filters',
        },
      });
    }

    const result = await options.dentists.list(query.data);
    return reply.send({ success: true, data: result });
  });
}
