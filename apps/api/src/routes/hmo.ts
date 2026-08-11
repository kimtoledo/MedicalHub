/**
 * HMO / Insurance claims routes.
 *
 * Auth requirements:
 * - Payer CRUD: clinic_admin / clinic_owner / super_admin
 * - Membership CRUD: any clinic member
 * - Claims: any clinic member (creation); status update: admin+
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hasClinicAccess, isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthorizationContext, AuthServices } from '../auth/types.js';
import { HmoServiceError, type HmoService } from '../clinic/hmo-service.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid();
const clinicParams = z.object({ clinicId: uuidSchema });
const patientParams = z.object({ clinicId: uuidSchema, patientId: uuidSchema });
const membershipParams = z.object({ clinicId: uuidSchema, patientId: uuidSchema, membershipId: uuidSchema });
const payerParams = z.object({ clinicId: uuidSchema, payerId: uuidSchema });
const claimParams = z.object({ clinicId: uuidSchema, claimId: uuidSchema });

const payerBodySchema = z.object({
  name: z.string().min(1).max(200),
  accreditationNumber: z.string().max(100).optional(),
  contactPerson: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(300).optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

const membershipBodySchema = z.object({
  hmoPayer: z.string().uuid().optional(),
  payerNameSnapshot: z.string().min(1).max(200),
  cardNumber: z.string().min(1).max(100),
  memberName: z.string().max(200).optional(),
  coverageType: z.enum(['dental', 'medical', 'combined']).default('dental'),
  effectiveDate: z.string().max(20).optional(),
  expiryDate: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
});

const claimCreateBodySchema = z.object({
  patientId: z.string().uuid(),
  hmoPayer: z.string().uuid().optional(),
  payerNameSnapshot: z.string().min(1).max(200),
  membershipId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  encounterId: z.string().uuid().optional(),
  loaCode: z.string().max(100).optional(),
  claimAmountPhp: z.string().regex(/^\d+(\.\d{1,2})?$/),
  notes: z.string().max(1000).optional(),
});

const claimStatusBodySchema = z.discriminatedUnion('to', [
  z.object({ to: z.literal('submitted') }),
  z.object({ to: z.literal('approved'), approvedAmountPhp: z.string().regex(/^\d+(\.\d{1,2})?$/) }),
  z.object({ to: z.literal('rejected'), rejectionReason: z.string().min(1).max(1000) }),
  z.object({ to: z.literal('paid'), notes: z.string().max(500).optional() }),
]);

const listClaimsQuerySchema = z.object({
  status: z.enum(['prepared', 'submitted', 'approved', 'rejected', 'paid']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function isAdminRole(authorization: AuthorizationContext, clinicId: string): boolean {
  if (isSuperAdmin(authorization)) return true;
  return hasClinicAccess(authorization, clinicId, ['clinic_admin', 'clinic_owner']);
}

function hmoErrStatus(err: HmoServiceError): number {
  return err.code === 'NOT_FOUND'           ? 404
    : err.code === 'INVOICE_NOT_FOUND'      ? 404
    : err.code === 'INVALID_TRANSITION'     ? 409
    : err.code === 'CLAIM_ALREADY_PAID'     ? 409
    : err.code === 'ALREADY_EXISTS'         ? 409
    : 400;
}

// ---------------------------------------------------------------------------
// Route options
// ---------------------------------------------------------------------------

export type HmoRoutesOptions = {
  auth: AuthServices;
  hmo: HmoService;
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export async function registerHmoRoutes(
  app: FastifyInstance,
  options: HmoRoutesOptions,
): Promise<void> {
  const { auth, hmo } = options;

  // ── Payer catalog ──────────────────────────────────────────────────────

  /** GET /v1/clinic/:clinicId/hmo/payers */
  app.get('/v1/clinic/:clinicId/hmo/payers', async (req, reply) => {
    const params = clinicParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(authorization) && !hasClinicAccess(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    const data = await hmo.listPayers(params.data.clinicId);
    return reply.send({ success: true, data });
  });

  /** POST /v1/clinic/:clinicId/hmo/payers — admin only */
  app.post('/v1/clinic/:clinicId/hmo/payers', async (req, reply) => {
    const params = clinicParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isAdminRole(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic admin required' } });
    }

    const body = payerBodySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message } });

    try {
      const payer = await hmo.createPayer(params.data.clinicId, body.data, authorization.user.id);
      return reply.status(201).send({ success: true, data: payer });
    } catch (err) {
      if (err instanceof HmoServiceError) return reply.status(hmoErrStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  /** PATCH /v1/clinic/:clinicId/hmo/payers/:payerId — admin only */
  app.patch('/v1/clinic/:clinicId/hmo/payers/:payerId', async (req, reply) => {
    const params = payerParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isAdminRole(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic admin required' } });
    }

    const body = payerBodySchema.partial().safeParse(req.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message } });

    try {
      await hmo.updatePayer(params.data.clinicId, params.data.payerId, body.data, authorization.user.id);
      return reply.send({ success: true });
    } catch (err) {
      if (err instanceof HmoServiceError) return reply.status(hmoErrStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // ── Patient memberships ────────────────────────────────────────────────

  /** GET /v1/clinic/:clinicId/patients/:patientId/hmo */
  app.get('/v1/clinic/:clinicId/patients/:patientId/hmo', async (req, reply) => {
    const params = patientParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(authorization) && !hasClinicAccess(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    const data = await hmo.listMemberships(params.data.clinicId, params.data.patientId);
    return reply.send({ success: true, data });
  });

  /** POST /v1/clinic/:clinicId/patients/:patientId/hmo — add membership */
  app.post('/v1/clinic/:clinicId/patients/:patientId/hmo', async (req, reply) => {
    const params = patientParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(authorization) && !hasClinicAccess(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    const body = membershipBodySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message } });

    const membership = await hmo.upsertMembership(params.data.clinicId, params.data.patientId, body.data);
    return reply.status(201).send({ success: true, data: membership });
  });

  /** DELETE /v1/clinic/:clinicId/patients/:patientId/hmo/:membershipId */
  app.delete('/v1/clinic/:clinicId/patients/:patientId/hmo/:membershipId', async (req, reply) => {
    const params = membershipParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(authorization) && !hasClinicAccess(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    try {
      await hmo.deleteMembership(params.data.clinicId, params.data.patientId, params.data.membershipId);
      return reply.send({ success: true });
    } catch (err) {
      if (err instanceof HmoServiceError) return reply.status(hmoErrStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  // ── Claims ─────────────────────────────────────────────────────────────

  /** GET /v1/clinic/:clinicId/hmo/claims */
  app.get('/v1/clinic/:clinicId/hmo/claims', async (req, reply) => {
    const params = clinicParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(authorization) && !hasClinicAccess(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    const query = listClaimsQuerySchema.safeParse(req.query);
    if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR' } });

    const result = await hmo.listClaims(params.data.clinicId, query.data);
    return reply.send({ success: true, ...result });
  });

  /** POST /v1/clinic/:clinicId/hmo/claims — create claim */
  app.post('/v1/clinic/:clinicId/hmo/claims', async (req, reply) => {
    const params = clinicParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(authorization) && !hasClinicAccess(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    const body = claimCreateBodySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message } });

    try {
      const claim = await hmo.createClaim(params.data.clinicId, body.data, authorization.user.id);
      return reply.status(201).send({ success: true, data: claim });
    } catch (err) {
      if (err instanceof HmoServiceError) return reply.status(hmoErrStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });

  /** GET /v1/clinic/:clinicId/hmo/claims/:claimId */
  app.get('/v1/clinic/:clinicId/hmo/claims/:claimId', async (req, reply) => {
    const params = claimParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(authorization) && !hasClinicAccess(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    const claim = await hmo.getClaim(params.data.clinicId, params.data.claimId);
    if (!claim) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    return reply.send({ success: true, data: claim });
  });

  /** GET /v1/clinic/:clinicId/hmo/claims/:claimId/pdf-data */
  app.get('/v1/clinic/:clinicId/hmo/claims/:claimId/pdf-data', async (req, reply) => {
    const params = claimParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(authorization) && !hasClinicAccess(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    const data = await hmo.getClaimPdfData(params.data.clinicId, params.data.claimId);
    if (!data) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND' } });
    return reply.send({ success: true, data });
  });

  /** PATCH /v1/clinic/:clinicId/hmo/claims/:claimId/status — admin+ only */
  app.patch('/v1/clinic/:clinicId/hmo/claims/:claimId/status', async (req, reply) => {
    const params = claimParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(req, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!isSuperAdmin(authorization) && !isAdminRole(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic admin or owner required to update claim status' } });
    }

    const body = claimStatusBodySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message } });

    try {
      await hmo.updateClaimStatus(params.data.clinicId, params.data.claimId, body.data, authorization.user.id);
      return reply.send({ success: true });
    } catch (err) {
      if (err instanceof HmoServiceError) return reply.status(hmoErrStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      throw err;
    }
  });
}
