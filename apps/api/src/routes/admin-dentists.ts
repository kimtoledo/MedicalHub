import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AdminDentistCreationError,
  type AdminDentistCreationService,
  type AdminDentistDetailService,
  type AdminDentistListService,
} from '../admin/dentists-service.js';
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

const optionalText = (maxLength: number) => z
  .string()
  .trim()
  .max(maxLength)
  .optional()
  .transform((value) => value || null);

const createDentistBodySchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  slug: z.string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  licenseNumber: optionalText(50),
  specialty: optionalText(200),
}).strict();

const dentistParamsSchema = z.object({
  dentistId: z.string().uuid(),
});

type RegisterAdminDentistRoutesOptions = {
  auth: AuthServices;
  dentists: AdminDentistListService;
  creation?: AdminDentistCreationService;
  details?: AdminDentistDetailService;
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

  const details = options.details;
  if (details) {
    app.get('/v1/admin/dentists/:dentistId', async (request, reply) => {
      const authorization = await resolveRequestAuthorization(request, options.auth);
      if (!authorization) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' },
        });
      }
      if (!isSuperAdmin(authorization)) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Super Admin access is required' },
        });
      }
      const params = dentistParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid dentist identifier' },
        });
      }
      const dentist = await details.getById(params.data.dentistId);
      if (!dentist) {
        return reply.status(404).send({
          success: false,
          error: { code: 'DENTIST_NOT_FOUND', message: 'Dentist not found' },
        });
      }
      return reply.send({ success: true, data: dentist });
    });
  }

  const creation = options.creation;
  if (creation) {
    app.post('/v1/admin/dentists', async (request, reply) => {
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

      const body = createDentistBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid dentist details',
          },
        });
      }

      try {
        const dentist = await creation.create(body.data, {
          id: authorization.user.id,
          email: authorization.user.email,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(201).send({ success: true, data: dentist });
      } catch (error) {
        if (!(error instanceof AdminDentistCreationError)) throw error;
        return reply.status(409).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }
    });
  }
}
