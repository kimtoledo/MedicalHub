import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { requireClinicFeature } from '../clinic/access.js';
import {
  ServiceCatalogError,
  type ClinicServiceCatalogService,
} from '../clinic/service-catalog-service.js';
import type { AuthServices, AuthorizationContext } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import { postgresUuidSchema } from '../validation.js';

const clinicParams = z.object({ clinicId: postgresUuidSchema });
const serviceParams = z.object({ clinicId: postgresUuidSchema, serviceId: postgresUuidSchema });
const listQuery = z.object({ branchId: postgresUuidSchema.optional() });
const priceSchema = z.union([z.string().regex(/^\d+(?:\.\d{1,2})?$/), z.null()]);
const createBody = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(100).default('General'),
  description: z.string().trim().max(5000).optional(),
  pricePhp: priceSchema.optional(),
  durationMinutes: z.number().int().min(15).max(240),
  workflowMode: z.enum(['quick', 'standard']).default('standard'),
  isBookable: z.boolean().default(true),
  isActive: z.boolean().default(true),
}).strict();
const updateBody = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  category: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  pricePhp: priceSchema.optional(),
  durationMinutes: z.number().int().min(15).max(240).optional(),
  workflowMode: z.enum(['quick', 'standard']).optional(),
  isBookable: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);
const priceBody = z.object({
  branchId: postgresUuidSchema.nullable().optional(),
  pricePhp: priceSchema,
  effectiveFrom: z.string().datetime({ offset: true }).optional(),
}).strict();

const viewRoles = ['clinic_owner', 'clinic_admin', 'dentist', 'receptionist', 'dental_assistant'] as const;
const manageRoles = ['clinic_owner', 'clinic_admin'] as const;

function actor(request: FastifyRequest, auth: AuthorizationContext) {
  return {
    id: auth.user.id,
    email: auth.user.email,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof ServiceCatalogError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

export async function registerClinicServiceCatalogRoutes(
  app: FastifyInstance,
  options: {
    auth: AuthServices;
    entitlements: EntitlementService;
    db?: import('@dentra/db').DB;
    serviceCatalog: ClinicServiceCatalogService;
  },
) {
  const guarded = async (
    request: FastifyRequest,
    reply: FastifyReply,
    clinicId: string,
    roles: readonly (typeof viewRoles[number])[],
  ) => requireClinicFeature(request, reply, options, clinicId, FeatureKey.SERVICE_CATALOG, [...roles]);

  app.get('/v1/clinic/:clinicId/catalog/branches', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic ID' } });
    if (!await guarded(request, reply, params.data.clinicId, viewRoles)) return;
    return reply.send({ success: true, data: await options.serviceCatalog.listBranches(params.data.clinicId) });
  });

  app.get('/v1/clinic/:clinicId/catalog/services', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    const query = listQuery.safeParse(request.query);
    if (!params.success || !query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid service catalog request' } });
    if (!await guarded(request, reply, params.data.clinicId, viewRoles)) return;
    return reply.send({ success: true, data: await options.serviceCatalog.listServices(params.data.clinicId, query.data.branchId) });
  });

  app.post('/v1/clinic/:clinicId/catalog/services', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    const body = createBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please check the service details' } });
    const auth = await guarded(request, reply, params.data.clinicId, manageRoles);
    if (!auth) return;
    try {
      return reply.status(201).send({ success: true, data: await options.serviceCatalog.createService(params.data.clinicId, body.data, actor(request, auth)) });
    } catch (error) { return sendError(reply, error); }
  });

  app.patch('/v1/clinic/:clinicId/catalog/services/:serviceId', async (request, reply) => {
    const params = serviceParams.safeParse(request.params);
    const body = updateBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please check the service changes' } });
    const auth = await guarded(request, reply, params.data.clinicId, manageRoles);
    if (!auth) return;
    try {
      return reply.send({ success: true, data: await options.serviceCatalog.updateService(params.data.clinicId, params.data.serviceId, body.data, actor(request, auth)) });
    } catch (error) { return sendError(reply, error); }
  });

  app.put('/v1/clinic/:clinicId/catalog/services/:serviceId/price', async (request, reply) => {
    const params = serviceParams.safeParse(request.params);
    const body = priceBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please check the price details' } });
    const auth = await guarded(request, reply, params.data.clinicId, manageRoles);
    if (!auth) return;
    try {
      return reply.send({ success: true, data: await options.serviceCatalog.setPrice(params.data.clinicId, params.data.serviceId, body.data, actor(request, auth)) });
    } catch (error) { return sendError(reply, error); }
  });

  app.get('/v1/clinic/:clinicId/catalog/services/:serviceId/price-history', async (request, reply) => {
    const params = serviceParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid service ID' } });
    if (!await guarded(request, reply, params.data.clinicId, viewRoles)) return;
    const data = await options.serviceCatalog.listPriceHistory(params.data.clinicId, params.data.serviceId);
    if (!data) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Service not found' } });
    return reply.send({ success: true, data });
  });
}
