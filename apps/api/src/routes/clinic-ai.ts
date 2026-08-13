/**
 * AI clinical assistance routes.
 *
 * All AI features are restricted to dentist / clinic_owner / clinic_admin.
 * Staff cannot invoke AI generation.
 *
 * Security: any optional encounterId is validated to belong to the route's
 * clinicId and the caller's branch scope before the provider is invoked or
 * an audit row is written.
 *
 * No PHI is written to logs — only interaction metadata.
 */
import type { FastifyInstance } from 'fastify';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { DB } from '@dentra/db';
import { encounters } from '@dentra/db/schema';
import {
  getClinicAccess,
  hasClinicAccess,
} from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import { hasActiveSupportGrant } from '../auth/support-access.js';
import type { AuthorizationContext, AuthServices } from '../auth/types.js';
import { AIServiceError, type AiAssistanceService } from '../clinic/ai-service.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const clinicParamsSchema = z.object({ clinicId: uuidSchema });

const noteSuggestBodySchema = z.object({
  chiefComplaint:  z.string().min(1).max(500),
  services:        z.array(z.string().max(200)).max(20).optional(),
  toothRefs:       z.array(z.string().max(50)).max(32).optional(),
  existingNotes:   z.string().max(2000).optional(),
  encounterId:     uuidSchema.optional(),
});

const recallSuggestBodySchema = z.object({
  procedures:    z.array(z.string().max(200)).min(1).max(20),
  lastVisitDate: z.string().max(50),
  encounterId:   uuidSchema.optional(),
});

const treatmentSequenceBodySchema = z.object({
  odontogramSummary: z.string().min(1).max(3000),
  patientAge:        z.number().int().min(1).max(120).optional(),
  notes:             z.string().max(500).optional(),
  encounterId:       uuidSchema.optional(),
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function checkDentistAuth(db: DB, authorization: AuthorizationContext, clinicId: string): Promise<boolean> {
  if (hasClinicAccess(authorization, clinicId, ['dentist', 'clinic_owner', 'clinic_admin'])) return true;
  return hasActiveSupportGrant(db, authorization, clinicId);
}

function getCallerBranchIds(authorization: AuthorizationContext, clinicId: string): string[] | null {
  const memberships = getClinicAccess(authorization, clinicId);
  if (memberships.length === 0) return null;
  if (memberships.some((m) => m.branchId === null)) return null;
  const ids = memberships.map((m) => m.branchId).filter((id): id is string => id !== null);
  return ids.length > 0 ? ids : null;
}

// ---------------------------------------------------------------------------
// Encounter tenant + branch validation
// ---------------------------------------------------------------------------

type EncounterCheckResult = 'valid' | 'not_found' | 'forbidden';

async function checkEncounterId(
  db: DB,
  clinicId: string,
  encounterId: string,
  callerBranchIds: string[] | null,
): Promise<EncounterCheckResult> {
  const [row] = await db
    .select({ id: encounters.id, branchId: encounters.branchId })
    .from(encounters)
    .where(and(eq(encounters.id, encounterId), eq(encounters.clinicId, clinicId)))
    .limit(1);

  if (!row) return 'not_found';

  if (
    callerBranchIds !== null &&
    callerBranchIds.length > 0 &&
    !callerBranchIds.includes(row.branchId)
  ) {
    return 'forbidden';
  }

  return 'valid';
}

function aiErrorStatus(err: AIServiceError): number {
  return err.code === 'NOT_CONFIGURED' ? 503
    : err.code === 'RATE_LIMITED'      ? 429
    : err.code === 'INVALID_RESPONSE'  ? 502
    : 502;
}

// ---------------------------------------------------------------------------
// Route options
// ---------------------------------------------------------------------------

export type ClinicAiRoutesOptions = {
  auth: AuthServices;
  aiService: AiAssistanceService;
  db: DB;
};

// ---------------------------------------------------------------------------
// Register routes
// ---------------------------------------------------------------------------

export async function registerClinicAiRoutes(
  app: FastifyInstance,
  options: ClinicAiRoutesOptions,
): Promise<void> {
  const { auth, aiService, db } = options;

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/ai/status  — check if AI is configured
  // Any clinic member can call this.
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/ai/status', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED' } });
    if (!hasClinicAccess(authorization, params.data.clinicId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    return reply.send({
      success: true,
      data: { configured: aiService.isConfigured() },
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/clinic/:clinicId/ai/suggest-notes  — streaming note generation
  // Dentist only. Returns text/event-stream (SSE).
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/ai/suggest-notes', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!(await checkDentistAuth(db, authorization, params.data.clinicId))) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Dentist role required for AI features' } });
    }

    const body = noteSuggestBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message } });

    // Validate encounterId ownership before invoking the provider
    const { clinicId } = params.data;
    const callerBranchIds = getCallerBranchIds(authorization, clinicId);

    if (body.data.encounterId) {
      const check = await checkEncounterId(db, clinicId, body.data.encounterId, callerBranchIds);
      if (check === 'not_found') return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Encounter not found in this clinic' } });
      if (check === 'forbidden')  return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN',   message: 'You do not have access to this encounter' } });
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.hijack();

    try {
      const gen = aiService.streamNoteSuggestion(
        clinicId,
        authorization.user.id,
        {
          chiefComplaint: body.data.chiefComplaint,
          services:       body.data.services,
          toothRefs:      body.data.toothRefs,
          existingNotes:  body.data.existingNotes,
        },
        body.data.encounterId,
      );

      for await (const delta of gen) {
        reply.raw.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    } catch (err) {
      if (err instanceof AIServiceError) {
        reply.raw.write(`data: ${JSON.stringify({ error: { code: err.code, message: err.message } })}\n\n`);
      } else {
        reply.raw.write(`data: ${JSON.stringify({ error: { code: 'PROVIDER_ERROR', message: 'AI request failed' } })}\n\n`);
      }
    } finally {
      reply.raw.write('data: [DONE]\n\n');
      reply.raw.end();
    }
  });

  // -----------------------------------------------------------------------
  // POST /v1/clinic/:clinicId/ai/suggest-recall  — recall interval suggestion
  // Dentist only. Non-streaming JSON response.
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/ai/suggest-recall', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!(await checkDentistAuth(db, authorization, params.data.clinicId))) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Dentist role required for AI features' } });
    }

    const body = recallSuggestBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message } });

    const { clinicId } = params.data;
    const callerBranchIds = getCallerBranchIds(authorization, clinicId);

    if (body.data.encounterId) {
      const check = await checkEncounterId(db, clinicId, body.data.encounterId, callerBranchIds);
      if (check === 'not_found') return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Encounter not found in this clinic' } });
      if (check === 'forbidden')  return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN',   message: 'You do not have access to this encounter' } });
    }

    try {
      const suggestion = await aiService.suggestRecall(
        clinicId,
        authorization.user.id,
        { procedures: body.data.procedures, lastVisitDate: body.data.lastVisitDate },
        body.data.encounterId,
      );
      return reply.send({ success: true, data: suggestion });
    } catch (err) {
      if (err instanceof AIServiceError) {
        return reply.status(aiErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // -----------------------------------------------------------------------
  // POST /v1/clinic/:clinicId/ai/suggest-treatment-sequence
  // Dentist only. Non-streaming JSON response.
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/ai/suggest-treatment-sequence', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!(await checkDentistAuth(db, authorization, params.data.clinicId))) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Dentist role required for AI features' } });
    }

    const body = treatmentSequenceBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message } });

    const { clinicId } = params.data;
    const callerBranchIds = getCallerBranchIds(authorization, clinicId);

    if (body.data.encounterId) {
      const check = await checkEncounterId(db, clinicId, body.data.encounterId, callerBranchIds);
      if (check === 'not_found') return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Encounter not found in this clinic' } });
      if (check === 'forbidden')  return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN',   message: 'You do not have access to this encounter' } });
    }

    try {
      const suggestion = await aiService.suggestTreatmentSequence(
        clinicId,
        authorization.user.id,
        {
          odontogramSummary: body.data.odontogramSummary,
          patientAge:        body.data.patientAge,
          notes:             body.data.notes,
        },
        body.data.encounterId,
      );
      return reply.send({ success: true, data: suggestion });
    } catch (err) {
      if (err instanceof AIServiceError) {
        return reply.status(aiErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });
}
