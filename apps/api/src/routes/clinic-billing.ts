import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getClinicAccess, hasClinicAccess, isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthorizationContext, AuthServices } from '../auth/types.js';
import {
  BillingError,
  type ClinicBillingService,
  type ClinicServiceListService,
} from '../clinic/billing-service.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const clinicParamsSchema = z.object({ clinicId: uuidSchema });
const invoiceParamsSchema = z.object({ clinicId: uuidSchema, invoiceId: uuidSchema });
const serviceParamsSchema = z.object({ clinicId: uuidSchema, serviceId: uuidSchema });

const listInvoicesQuerySchema = z.object({
  search:   z.string().trim().max(100).default(''),
  status:   z.enum(['pending', 'paid', 'voided']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// branchId is intentionally removed — branch is derived from the encounter server-side
const generateInvoiceBodySchema = z.object({
  encounterId: uuidSchema,
});

const recordPaymentBodySchema = z.object({
  amountPhp:     z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentMethod: z.enum(['cash', 'gcash', 'card', 'bank_transfer', 'other']),
  paymentDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:         z.string().trim().max(500).optional(),
});

const updateServicePriceBodySchema = z.object({
  pricePhp: z
    .union([
      z.string().regex(/^\d+(\.\d{1,2})?$/),
      z.null(),
    ])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Allow super admins (platform-wide role) OR clinic members.
 * hasClinicAccess only looks at clinic memberships, so super admins would
 * otherwise be denied; we must check isSuperAdmin first.
 */
function checkClinicAuth(
  authorization: AuthorizationContext,
  clinicId: string,
  allowedRoles?: Parameters<typeof hasClinicAccess>[2],
): boolean {
  if (isSuperAdmin(authorization)) return true;
  return hasClinicAccess(authorization, clinicId, allowedRoles);
}

/**
 * Returns the set of branch IDs the caller is permitted to access.
 *
 * - null  → caller has clinic-wide access (no branch restriction).
 *           This includes super admins and members with at least one
 *           clinic-wide (branchId=null) membership row.
 * - string[] → caller may only access these specific branches.
 *              Multi-branch membership is fully supported.
 */
function getCallerBranchIds(authorization: AuthorizationContext, clinicId: string): string[] | null {
  if (isSuperAdmin(authorization)) return null;
  const memberships = getClinicAccess(authorization, clinicId);
  // Any membership with branchId=null grants clinic-wide access.
  if (memberships.some((m) => m.branchId === null)) return null;
  const ids = memberships.map((m) => m.branchId).filter((id): id is string => id !== null);
  return ids.length > 0 ? ids : null;
}

// ---------------------------------------------------------------------------
// Register routes
// ---------------------------------------------------------------------------

export type ClinicBillingRoutesOptions = {
  auth: AuthServices;
  billingService: ClinicBillingService;
  serviceListService: ClinicServiceListService;
};

export async function registerClinicBillingRoutes(
  app: FastifyInstance,
  options: ClinicBillingRoutesOptions,
): Promise<void> {
  const { auth, billingService, serviceListService } = options;

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/services
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/services
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/services', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const data = await serviceListService.listServices(params.data.clinicId);
    return reply.send({ success: true, data });
  });

  // -----------------------------------------------------------------------
  // PATCH /v1/clinic/:clinicId/services/:serviceId/price
  // -----------------------------------------------------------------------
  app.patch('/v1/clinic/:clinicId/services/:serviceId/price', async (request, reply) => {
    const params = serviceParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    // Super admins can update pricing; clinic-member callers need admin/owner role.
    if (!checkClinicAuth(authorization, params.data.clinicId, ['clinic_owner', 'clinic_admin'])) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic admin access required' } });
    }

    const body = updateServicePriceBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid price value' } });

    try {
      await serviceListService.updateServicePrice(params.data.clinicId, params.data.serviceId, body.data.pricePhp);
      return reply.send({ success: true });
    } catch (err) {
      if (err instanceof BillingError && err.code === 'NOT_FOUND') {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
      }
      throw err;
    }
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/invoices
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/invoices', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const query = listInvoicesQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query params' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const result = await billingService.listInvoices(params.data.clinicId, { ...query.data, callerBranchIds });
    return reply.send({ success: true, ...result });
  });

  // -----------------------------------------------------------------------
  // POST /v1/clinic/:clinicId/invoices
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/invoices', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const body = generateInvoiceBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid invoice data' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);

    try {
      const result = await billingService.generateInvoice(
        params.data.clinicId,
        body.data.encounterId,
        authorization.user.id,
        callerBranchIds,
      );
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof BillingError) {
        const status = err.code === 'NOT_FOUND' ? 404
          : err.code === 'CONFLICT'       ? 409
          : err.code === 'INVALID_STATE'  ? 422
          : err.code === 'FORBIDDEN'      ? 403
          : 400;
        return reply.status(status).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/invoices/:invoiceId
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/invoices/:invoiceId', async (request, reply) => {
    const params = invoiceParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const invoice = await billingService.getInvoice(params.data.clinicId, params.data.invoiceId, callerBranchIds);
    if (!invoice) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });

    return reply.send({ success: true, data: invoice });
  });

  // -----------------------------------------------------------------------
  // POST /v1/clinic/:clinicId/invoices/:invoiceId/pay
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/invoices/:invoiceId/pay', async (request, reply) => {
    const params = invoiceParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const body = recordPaymentBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payment data' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);

    try {
      await billingService.recordPayment(params.data.clinicId, params.data.invoiceId, {
        ...body.data,
        recordedBy: authorization.user.id,
        callerBranchIds,
      });
      return reply.send({ success: true });
    } catch (err) {
      if (err instanceof BillingError) {
        const status = err.code === 'NOT_FOUND'     ? 404
          : err.code === 'INVALID_STATE' ? 422
          : err.code === 'FORBIDDEN'     ? 403
          : 400;
        return reply.status(status).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/invoices/unbilled
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/invoices/unbilled', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const data = await billingService.listUnbilledEncounters(params.data.clinicId, callerBranchIds);
    return reply.send({ success: true, data });
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/earnings/today
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/earnings/today', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const data = await billingService.getTodayEarnings(params.data.clinicId, callerBranchIds);
    return reply.send({ success: true, data });
  });
}
