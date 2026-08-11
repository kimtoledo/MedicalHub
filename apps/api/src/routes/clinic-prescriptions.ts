import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getClinicAccess, hasClinicAccess, isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthorizationContext, AuthServices } from '../auth/types.js';
import {
  PrescriptionError,
  type ClinicPrescriptionService,
} from '../clinic/prescription-service.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const clinicParamsSchema = z.object({ clinicId: uuidSchema });
const prescriptionParamsSchema = z.object({ clinicId: uuidSchema, prescriptionId: uuidSchema });

const prescriptionItemSchema = z.object({
  medicineName: z.string().trim().min(1).max(300),
  dosage: z.string().trim().max(200).nullish(),
  frequency: z.string().trim().max(200).nullish(),
  duration: z.string().trim().max(200).nullish(),
  specialInstructions: z.string().trim().max(1000).nullish(),
  sortOrder: z.number().int().min(0).optional(),
});

const issuePrescriptionBodySchema = z.object({
  encounterId: uuidSchema,
  prcLicenseNumber: z.string().trim().max(50).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  items: z.array(prescriptionItemSchema).min(1).max(20),
});

const amendPrescriptionBodySchema = z.object({
  prcLicenseNumber: z.string().trim().max(50).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  items: z.array(prescriptionItemSchema).min(1).max(20),
});

const listPrescriptionsQuerySchema = z.object({
  patientId:   uuidSchema.optional(),
  encounterId: uuidSchema.optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// Auth helpers (same pattern as billing routes)
// ---------------------------------------------------------------------------

function checkClinicAuth(
  authorization: AuthorizationContext,
  clinicId: string,
  allowedRoles?: Parameters<typeof hasClinicAccess>[2],
): boolean {
  if (isSuperAdmin(authorization)) return true;
  return hasClinicAccess(authorization, clinicId, allowedRoles);
}

function getCallerBranchIds(authorization: AuthorizationContext, clinicId: string): string[] | null {
  if (isSuperAdmin(authorization)) return null;
  const memberships = getClinicAccess(authorization, clinicId);
  if (memberships.some((m) => m.branchId === null)) return null;
  const ids = memberships.map((m) => m.branchId).filter((id): id is string => id !== null);
  return ids.length > 0 ? ids : null;
}

/**
 * Returns the dentist ID linked to the caller's dentist membership for this clinic.
 * Returns null for super admins (they cannot issue prescriptions on behalf of a dentist).
 * Returns null if the caller has no dentist membership (enforced separately by role check).
 */
function getCallerDentistId(authorization: AuthorizationContext, clinicId: string): string | null {
  if (isSuperAdmin(authorization)) return null;
  const memberships = getClinicAccess(authorization, clinicId);
  const dentistMembership = memberships.find((m) => m.role === 'dentist' && m.dentistId != null);
  return dentistMembership?.dentistId ?? null;
}

// ---------------------------------------------------------------------------
// Route options
// ---------------------------------------------------------------------------

export type ClinicPrescriptionRoutesOptions = {
  auth: AuthServices;
  prescriptionService: ClinicPrescriptionService;
};

// ---------------------------------------------------------------------------
// Register routes
// ---------------------------------------------------------------------------

export async function registerClinicPrescriptionRoutes(
  app: FastifyInstance,
  options: ClinicPrescriptionRoutesOptions,
): Promise<void> {
  const { auth, prescriptionService } = options;

  // ─── helpers ─────────────────────────────────────────────────────────────
  function prescriptionErrorStatus(err: PrescriptionError): number {
    return err.code === 'NOT_FOUND'     ? 404
      : err.code === 'FORBIDDEN'        ? 403
      : err.code === 'INVALID_STATE'    ? 422
      : err.code === 'CONFLICT'         ? 409
      : 400;
  }

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/prescriptions/encounters
  // Returns finalized encounters available for prescription issuance.
  // MUST be registered before the /:prescriptionId route.
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/prescriptions/encounters', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const data = await prescriptionService.listFinalizedEncounters(params.data.clinicId, callerBranchIds);
    return reply.send({ success: true, data });
  });

  // -----------------------------------------------------------------------
  // POST /v1/clinic/:clinicId/prescriptions — issue a new prescription
  // Only dentists may issue prescriptions. Super admins are excluded because
  // they have no dentist profile and cannot be the prescriber.
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/prescriptions', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    // Only dentist role may issue prescriptions
    if (!checkClinicAuth(authorization, params.data.clinicId, ['dentist'])) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only dentists may issue prescriptions' } });
    }

    const callerDentistId = getCallerDentistId(authorization, params.data.clinicId);
    if (!callerDentistId) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Your account is not linked to a dentist profile' } });
    }

    const body = issuePrescriptionBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid prescription data' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);

    try {
      const result = await prescriptionService.issuePrescription(params.data.clinicId, {
        ...body.data,
        callerBranchIds,
        issuedBy: authorization.user.id,
        callerDentistId,
      });
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof PrescriptionError) {
        return reply.status(prescriptionErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/prescriptions — list prescriptions
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/prescriptions', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const query = listPrescriptionsQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query params' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const result = await prescriptionService.listPrescriptions(params.data.clinicId, {
      ...query.data,
      callerBranchIds,
    });
    return reply.send({ success: true, ...result });
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/prescriptions/:prescriptionId — get detail
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/prescriptions/:prescriptionId', async (request, reply) => {
    const params = prescriptionParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const rx = await prescriptionService.getPrescription(
      params.data.clinicId,
      params.data.prescriptionId,
      callerBranchIds,
    );
    if (!rx) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Prescription not found' } });

    return reply.send({ success: true, data: rx });
  });

  // -----------------------------------------------------------------------
  // POST /v1/clinic/:clinicId/prescriptions/:prescriptionId/amend
  // Only dentists may amend prescriptions.
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/prescriptions/:prescriptionId/amend', async (request, reply) => {
    const params = prescriptionParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    // Only dentist role may amend prescriptions
    if (!checkClinicAuth(authorization, params.data.clinicId, ['dentist'])) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only dentists may amend prescriptions' } });
    }

    const callerDentistId = getCallerDentistId(authorization, params.data.clinicId);
    if (!callerDentistId) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Your account is not linked to a dentist profile' } });
    }

    const body = amendPrescriptionBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid amendment data' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);

    try {
      const result = await prescriptionService.amendPrescription(
        params.data.clinicId,
        params.data.prescriptionId,
        {
          encounterId: '',   // unused in amendPrescription; original encounterId is preserved
          ...body.data,
          callerBranchIds,
          issuedBy: authorization.user.id,
          callerDentistId,
        },
      );
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof PrescriptionError) {
        return reply.status(prescriptionErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });
}
