import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import {
  AdminClinicBranchCreationError,
  AdminClinicCreationError,
  AdminClinicStatusError,
  type AdminClinicBranchCreationService,
  type AdminClinicCreationService,
  type AdminClinicDetailService,
  type AdminClinicListService,
  type AdminClinicStatusService,
} from '../admin/clinics-service.js';

const postgresUuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
);

const listClinicsQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  status: z.enum(['trial', 'active', 'suspended', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

const createClinicBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  prefix: z.string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(8)
    .regex(/^[A-Z0-9]+$/),
  ownerEmail: z.string().trim().toLowerCase().email().max(255),
  packageId: postgresUuidSchema,
});

const clinicParamsSchema = z.object({
  clinicId: postgresUuidSchema,
});

const updateClinicStatusBodySchema = z.object({
  status: z.enum(['active', 'suspended', 'archived']),
});

const optionalText = (maxLength: number) => z
  .union([z.string().trim().max(maxLength), z.null()])
  .optional()
  .transform((value) => value || null);

const createClinicBranchBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  isMain: z.boolean().default(false),
  phone: optionalText(20),
  email: z
    .union([
      z.string().trim().toLowerCase().email().max(255),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => value || null),
  address: optionalText(500),
  city: optionalText(100),
  province: optionalText(100),
}).strict();

type RegisterAdminClinicRoutesOptions = {
  auth: AuthServices;
  clinics: AdminClinicListService;
  creation?: AdminClinicCreationService;
  details?: AdminClinicDetailService;
  status?: AdminClinicStatusService;
  branchCreation?: AdminClinicBranchCreationService;
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

  const details = options.details;
  if (details) {
    app.get('/v1/admin/clinics/:clinicId', async (request, reply) => {
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

      const params = clinicParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid clinic identifier',
          },
        });
      }

      const clinic = await details.getById(params.data.clinicId);
      if (!clinic) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CLINIC_NOT_FOUND',
            message: 'Clinic not found',
          },
        });
      }

      return reply.send({ success: true, data: clinic });
    });
  }

  const statusService = options.status;
  if (statusService) {
    app.patch('/v1/admin/clinics/:clinicId/status', async (request, reply) => {
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

      const params = clinicParamsSchema.safeParse(request.params);
      const body = updateClinicStatusBodySchema.safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid clinic status update',
          },
        });
      }

      try {
        const userAgent = request.headers['user-agent'];
        const clinic = await statusService.updateStatus(
          params.data.clinicId,
          body.data.status,
          {
            id: authorization.user.id,
            email: authorization.user.email,
            ipAddress: request.ip,
            userAgent:
              typeof userAgent === 'string'
                ? userAgent.slice(0, 500)
                : undefined,
          },
        );

        return reply.send({ success: true, data: clinic });
      } catch (error) {
        if (!(error instanceof AdminClinicStatusError)) {
          throw error;
        }

        const statusCode = error.code === 'CLINIC_NOT_FOUND' ? 404 : 409;
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }
    });
  }

  const branchCreation = options.branchCreation;
  if (branchCreation) {
    app.post('/v1/admin/clinics/:clinicId/branches', async (request, reply) => {
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

      const params = clinicParamsSchema.safeParse(request.params);
      const body = createClinicBranchBodySchema.safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid branch details',
          },
        });
      }

      try {
        const userAgent = request.headers['user-agent'];
        const branch = await branchCreation.create(
          params.data.clinicId,
          body.data,
          {
            id: authorization.user.id,
            email: authorization.user.email,
            ipAddress: request.ip,
            userAgent:
              typeof userAgent === 'string'
                ? userAgent.slice(0, 500)
                : undefined,
          },
        );

        return reply.status(201).send({ success: true, data: branch });
      } catch (error) {
        if (!(error instanceof AdminClinicBranchCreationError)) {
          throw error;
        }

        const statusCode = error.code === 'CLINIC_NOT_FOUND' ? 404 : 409;
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }
    });
  }

  const creation = options.creation;
  if (!creation) {
    return;
  }

  app.get('/v1/admin/packages/options', async (request, reply) => {
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

    const packageOptions = await creation.listPackageOptions();
    return reply.send({ success: true, data: packageOptions });
  });

  app.post('/v1/admin/clinics', async (request, reply) => {
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

    const body = createClinicBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid clinic details',
        },
      });
    }

    try {
      const clinic = await creation.create(body.data, {
        id: authorization.user.id,
        email: authorization.user.email,
      });

      return reply.status(201).send({ success: true, data: clinic });
    } catch (error) {
      if (!(error instanceof AdminClinicCreationError)) {
        throw error;
      }

      const statusCode = error.code === 'PACKAGE_NOT_AVAILABLE' ? 400 : 409;
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
  });
}
