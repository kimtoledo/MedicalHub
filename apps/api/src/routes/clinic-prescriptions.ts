import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { getClinicAccess } from '../auth/authorization.js';
import type { AuthorizationContext, AuthServices } from '../auth/types.js';
import { requireClinicFeature } from '../clinic/access.js';
import type { EntitlementService } from '../entitlements/service.js';
import {
  PrescriptionError,
  type ClinicPrescriptionService,
} from '../clinic/prescription-service.js';
import { isActiveClinicDentist } from '../clinic/dentist-directory.js';
import type { NotificationService } from '../notifications/service.js';

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

/** Required on all of these when the caller isn't a dentist themselves — the dentist this action is attributed to. */
const attributedDentistSchema = { dentistId: uuidSchema.optional() };

const issuePrescriptionBodySchema = z.object({
  encounterId: uuidSchema,
  prcLicenseNumber: z.string().trim().max(50).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  items: z.array(prescriptionItemSchema).min(1).max(20),
  ...attributedDentistSchema,
});

const amendPrescriptionBodySchema = z.object({
  prcLicenseNumber: z.string().trim().max(50).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  items: z.array(prescriptionItemSchema).min(1).max(20),
  ...attributedDentistSchema,
});

const prescriberDefaultsQuerySchema = z.object({
  ...attributedDentistSchema,
});

const listPrescriptionsQuerySchema = z.object({
  patientId:   uuidSchema.optional(),
  encounterId: uuidSchema.optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const signatureBodySchema = z.object({
  /**
   * Base64 data-URL of the dentist's signature image (drawn or uploaded).
   * An empty string clears / removes the saved signature.
   * Max ~500 KB when set.
   */
  signatureData: z
    .string()
    .max(700_000)
    .refine((v) => v === '' || v.startsWith('data:image/'), {
      message: 'signatureData must be a base64 image data-URL (data:image/...) or an empty string to clear',
    }),
  ...attributedDentistSchema,
});

const templateBodySchema = z.object({
  templateId: z.enum(['classic', 'modern', 'minimal']),
  ...attributedDentistSchema,
});

const shareEmailBodySchema = z.object({
  /** Email address to send the prescription link to. */
  patientEmail: z.string().trim().email().max(320),
});

// ---------------------------------------------------------------------------
// Auth helpers (same pattern as billing routes)
// ---------------------------------------------------------------------------

function getCallerBranchIds(authorization: AuthorizationContext, clinicId: string): string[] | null {
  const memberships = getClinicAccess(authorization, clinicId);
  if (memberships.some((m) => m.branchId === null)) return null;
  const ids = memberships.map((m) => m.branchId).filter((id): id is string => id !== null);
  return ids.length > 0 ? ids : null;
}

/**
 * Returns the dentist ID linked to the caller's dentist membership for this clinic.
 * Returns null if the caller has no dentist membership (enforced separately by role check).
 */
function getCallerDentistId(authorization: AuthorizationContext, clinicId: string): string | null {
  const memberships = getClinicAccess(authorization, clinicId);
  const dentistMembership = memberships.find((m) => m.role === 'dentist' && m.dentistId != null);
  return dentistMembership?.dentistId ?? null;
}

const adminRoles = new Set(['clinic_owner', 'clinic_admin']);

function isClinicAdmin(authorization: AuthorizationContext, clinicId: string): boolean {
  return getClinicAccess(authorization, clinicId).some((m) => adminRoles.has(m.role));
}

// ---------------------------------------------------------------------------
// Route options
// ---------------------------------------------------------------------------

export type ClinicPrescriptionRoutesOptions = {
  auth: AuthServices;
  entitlements: EntitlementService;
  db?: import('@dentra/db').DB;
  prescriptionService: ClinicPrescriptionService;
  notifications?: NotificationService;
};

const clinicalRoles = ['clinic_owner', 'clinic_admin', 'dentist', 'dental_assistant'] as const;
const authoringRoles = ['dentist', 'clinic_owner', 'clinic_admin'] as const;

// ---------------------------------------------------------------------------
// Register routes
// ---------------------------------------------------------------------------

export async function registerClinicPrescriptionRoutes(
  app: FastifyInstance,
  options: ClinicPrescriptionRoutesOptions,
): Promise<void> {
  const { auth, entitlements, prescriptionService, notifications } = options;

  // ─── helpers ─────────────────────────────────────────────────────────────
  function prescriptionErrorStatus(err: PrescriptionError): number {
    return err.code === 'NOT_FOUND'     ? 404
      : err.code === 'FORBIDDEN'        ? 403
      : err.code === 'INVALID_STATE'    ? 422
      : err.code === 'CONFLICT'         ? 409
      : 400;
  }

  /**
   * Resolves the dentist a prescription-related action is attributed to: the
   * caller's own dentist membership, or (for clinic_owner/clinic_admin) an
   * explicitly-attributed dentistId validated as actively assigned here.
   * Prescriber identity is never left to guesswork — someone must always be named.
   */
  async function resolveActingDentist(authorization: AuthorizationContext, clinicId: string, attributedDentistId?: string): Promise<{ dentistId: string } | { error: { code: string; message: string; statusCode: number } }> {
    const own = getCallerDentistId(authorization, clinicId);
    if (own) return { dentistId: own };
    if (!isClinicAdmin(authorization, clinicId) || !attributedDentistId) {
      return { error: { code: 'FORBIDDEN', message: 'Your account is not linked to a dentist profile, and no attributed dentistId was provided', statusCode: 403 } };
    }
    if (!options.db || !(await isActiveClinicDentist(options.db, clinicId, attributedDentistId))) {
      return { error: { code: 'DENTIST_NOT_ASSIGNED', message: 'The selected dentist is not active in this clinic', statusCode: 400 } };
    }
    return { dentistId: attributedDentistId };
  }

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/prescriptions/encounters
  // Returns finalized encounters available for prescription issuance.
  // MUST be registered before the /:prescriptionId route.
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/prescriptions/encounters', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    const query = prescriberDefaultsQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await requireClinicFeature(request, reply, { auth, entitlements }, params.data.clinicId, FeatureKey.PRESCRIPTIONS, [...authoringRoles]);
    if (!authorization) return;

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const ownDentistId = getCallerDentistId(authorization, params.data.clinicId);
    // Admins browsing without having picked a prescribing dentist yet only need the encounter list;
    // defaults (license/signature/template) are fetched once they've picked one via `dentistId`.
    const targetDentistId = ownDentistId ?? query.data.dentistId;
    if (!ownDentistId && targetDentistId && (!options.db || !(await isActiveClinicDentist(options.db, params.data.clinicId, targetDentistId)))) {
      return reply.status(400).send({ success: false, error: { code: 'DENTIST_NOT_ASSIGNED', message: 'The selected dentist is not active in this clinic' } });
    }
    const [encounters, defaults] = await Promise.all([
      prescriptionService.listFinalizedEncounters(params.data.clinicId, callerBranchIds),
      targetDentistId ? prescriptionService.getPrescriberDefaults(targetDentistId) : Promise.resolve({}),
    ]);
    return reply.send({ success: true, data: { encounters, ...defaults } });
  });

  // -----------------------------------------------------------------------
  // PUT /v1/clinic/:clinicId/prescriptions/signature
  // Save the caller's dentist signature (base64 data-URL).
  // MUST be registered before /:prescriptionId to avoid route ambiguity.
  // -----------------------------------------------------------------------
  app.put('/v1/clinic/:clinicId/prescriptions/signature', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await requireClinicFeature(request, reply, { auth, entitlements }, params.data.clinicId, FeatureKey.PRESCRIPTIONS, [...authoringRoles]);
    if (!authorization) return;

    const body = signatureBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues.map((i) => i.message).join(', ') } });
    }

    const resolved = await resolveActingDentist(authorization, params.data.clinicId, body.data.dentistId);
    if ('error' in resolved) return reply.status(resolved.error.statusCode).send({ success: false, error: { code: resolved.error.code, message: resolved.error.message } });

    await prescriptionService.updateDentistSignature(resolved.dentistId, body.data.signatureData);
    return reply.send({ success: true });
  });

  // -----------------------------------------------------------------------
  // PATCH /v1/clinic/:clinicId/prescriptions/template
  // Save the caller's preferred prescription template ID.
  // MUST be registered before /:prescriptionId to avoid route ambiguity.
  // -----------------------------------------------------------------------
  app.patch('/v1/clinic/:clinicId/prescriptions/template', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await requireClinicFeature(request, reply, { auth, entitlements }, params.data.clinicId, FeatureKey.PRESCRIPTIONS, [...authoringRoles]);
    if (!authorization) return;

    const body = templateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'templateId must be one of: classic, modern, minimal' } });
    }

    const resolved = await resolveActingDentist(authorization, params.data.clinicId, body.data.dentistId);
    if ('error' in resolved) return reply.status(resolved.error.statusCode).send({ success: false, error: { code: resolved.error.code, message: resolved.error.message } });

    await prescriptionService.updateDentistTemplate(resolved.dentistId, body.data.templateId);
    return reply.send({ success: true });
  });

  // -----------------------------------------------------------------------
  // POST /v1/clinic/:clinicId/prescriptions — issue a new prescription
  // Only dentists may issue prescriptions. Prescriber identity always comes
  // from the authenticated clinic membership.
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/prescriptions', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await requireClinicFeature(request, reply, { auth, entitlements }, params.data.clinicId, FeatureKey.PRESCRIPTIONS, [...authoringRoles]);
    if (!authorization) return;

    const body = issuePrescriptionBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid prescription data' } });

    const resolved = await resolveActingDentist(authorization, params.data.clinicId, body.data.dentistId);
    if ('error' in resolved) return reply.status(resolved.error.statusCode).send({ success: false, error: { code: resolved.error.code, message: resolved.error.message } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const { dentistId: _attributedDentistId, ...issueInput } = body.data;

    try {
      const result = await prescriptionService.issuePrescription(params.data.clinicId, {
        ...issueInput,
        callerBranchIds,
        issuedBy: authorization.user.id,
        callerDentistId: resolved.dentistId,
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

    const authorization = await requireClinicFeature(request, reply, { auth, entitlements }, params.data.clinicId, FeatureKey.PRESCRIPTIONS, [...clinicalRoles]);
    if (!authorization) return;

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

    const authorization = await requireClinicFeature(request, reply, { auth, entitlements }, params.data.clinicId, FeatureKey.PRESCRIPTIONS, [...clinicalRoles]);
    if (!authorization) return;

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
  // POST /v1/clinic/:clinicId/prescriptions/:prescriptionId/share-email
  // Enqueue an email notification with a link to the prescription.
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/prescriptions/:prescriptionId/share-email', async (request, reply) => {
    const params = prescriptionParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await requireClinicFeature(request, reply, { auth, entitlements }, params.data.clinicId, FeatureKey.PRESCRIPTIONS, [...clinicalRoles]);
    if (!authorization) return;

    const body = shareEmailBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid patient email address is required' } });
    }

    if (!notifications) {
      return reply.status(503).send({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Notification service is not configured' } });
    }

    try {
      const result = await prescriptionService.sharePrescriptionByEmail(
        params.data.clinicId,
        params.data.prescriptionId,
        body.data.patientEmail,
        notifications,
      );
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof PrescriptionError) {
        return reply.status(prescriptionErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // -----------------------------------------------------------------------
  // POST /v1/clinic/:clinicId/prescriptions/:prescriptionId/amend
  // Only dentists may amend prescriptions.
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/prescriptions/:prescriptionId/amend', async (request, reply) => {
    const params = prescriptionParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await requireClinicFeature(request, reply, { auth, entitlements }, params.data.clinicId, FeatureKey.PRESCRIPTIONS, [...authoringRoles]);
    if (!authorization) return;

    const body = amendPrescriptionBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid amendment data' } });

    const resolved = await resolveActingDentist(authorization, params.data.clinicId, body.data.dentistId);
    if ('error' in resolved) return reply.status(resolved.error.statusCode).send({ success: false, error: { code: resolved.error.code, message: resolved.error.message } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const { dentistId: _attributedDentistId, ...amendInput } = body.data;

    try {
      const result = await prescriptionService.amendPrescription(
        params.data.clinicId,
        params.data.prescriptionId,
        {
          encounterId: '',   // unused in amendPrescription; original encounterId is preserved
          ...amendInput,
          callerBranchIds,
          issuedBy: authorization.user.id,
          callerDentistId: resolved.dentistId,
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
