/**
 * Remote consultation (tele-dentistry) routes.
 *
 * Public:
 *   POST /v1/public/consult/:clinicId          — patient submission (no auth)
 *   GET  /v1/remote-consults/:id/photos/:idx/download?token=X — photo stream
 *
 * Authenticated (clinic member):
 *   GET    /v1/clinic/:clinicId/remote-consults         — list
 *   GET    /v1/clinic/:clinicId/remote-consults/:id     — detail
 *   GET    /v1/clinic/:clinicId/remote-consults/:id/photos/:idx/url — sign URL
 *   PATCH  /v1/clinic/:clinicId/remote-consults/:id/review  — submit assessment
 *   PATCH  /v1/clinic/:clinicId/remote-consults/:id/close   — close
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DB } from '@dentra/db';
import { hasClinicAccess } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import { hasActiveSupportGrant } from '../auth/support-access.js';
import type { AuthorizationContext, AuthServices } from '../auth/types.js';
import {
  RemoteConsultError,
  verifyPhotoToken,
  type RemoteConsultsService,
} from '../clinic/remote-consults-service.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const clinicParamsSchema   = z.object({ clinicId:    uuidSchema });
const assessmentParamsSchema = z.object({ clinicId: uuidSchema, assessmentId: uuidSchema });
const photoParamsSchema = z.object({
  clinicId:     uuidSchema,
  assessmentId: uuidSchema,
  photoIndex:   z.coerce.number().int().min(0).max(4),
});

const listQuerySchema = z.object({
  status:   z.enum(['pending', 'reviewed', 'closed']).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const reviewBodySchema = z.object({
  dentistNotes: z.string().min(1).max(5000),
  nextStep: z.enum(['in_clinic_visit', 'prescription', 'monitoring', 'emergency', 'none']),
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function rcErrorStatus(err: RemoteConsultError): number {
  return err.code === 'NOT_FOUND'       ? 404
    : err.code === 'FORBIDDEN'          ? 403
    : err.code === 'ALREADY_REVIEWED'   ? 409
    : err.code === 'TOO_MANY_PHOTOS'    ? 422
    : err.code === 'INVALID_TYPE'       ? 422
    : err.code === 'TOO_LARGE'          ? 413
    : err.code === 'CLINIC_NOT_FOUND'   ? 404
    : err.code === 'UPLOAD_FAILED'      ? 502
    : 400;
}

// ---------------------------------------------------------------------------
// Route options
// ---------------------------------------------------------------------------

export type RemoteConsultRoutesOptions = {
  auth: AuthServices;
  rcService: RemoteConsultsService;
  db?: DB;
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export async function registerRemoteConsultRoutes(
  app: FastifyInstance,
  options: RemoteConsultRoutesOptions,
): Promise<void> {
  const { auth, rcService, db } = options;
  async function allowed(authorization: AuthorizationContext, clinicId: string, roles?: Parameters<typeof hasClinicAccess>[2]): Promise<boolean> {
    if (hasClinicAccess(authorization, clinicId, roles)) return true;
    return db ? hasActiveSupportGrant(db, authorization, clinicId) : false;
  }

  // -----------------------------------------------------------------------
  // POST /v1/public/consult/:clinicId  — PUBLIC patient submission
  // Accepts multipart/form-data: complaint (field) + up to 5 photo files.
  // -----------------------------------------------------------------------
  app.post('/v1/public/consult/:clinicId', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });
    }

    let patientName  = '';
    let patientEmail = '';
    let patientPhone = '';
    let complaint    = '';
    const photos: Array<{ buffer: Buffer; originalFilename: string; mimeType: string; sizeBytes: number }> = [];

    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          if (photos.length >= 5) {
            await part.toBuffer(); // drain
            continue;
          }
          const buf = await part.toBuffer();
          photos.push({
            buffer: buf,
            originalFilename: part.filename ?? 'photo',
            mimeType: part.mimetype,
            sizeBytes: buf.byteLength,
          });
        } else {
          const val = (part as { value: string }).value;
          if (part.fieldname === 'patientName')  patientName  = val;
          if (part.fieldname === 'patientEmail') patientEmail = val;
          if (part.fieldname === 'patientPhone') patientPhone = val;
          if (part.fieldname === 'complaint')    complaint    = val;
        }
      }
    } catch {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid multipart request' } });
    }

    // Basic field validation
    if (!patientName.trim() || !patientEmail.trim() || !complaint.trim()) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, and complaint are required' },
      });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail.trim());
    if (!emailOk) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid email address' } });
    }

    try {
      const result = await rcService.submitConsult(params.data.clinicId, {
        patientName:  patientName.trim(),
        patientEmail: patientEmail.trim(),
        patientPhone: patientPhone.trim() || undefined,
        complaint:    complaint.trim(),
        photos,
      });
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof RemoteConsultError) {
        return reply.status(rcErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // -----------------------------------------------------------------------
  // GET /v1/remote-consults/:assessmentId/photos/:photoIndex/download
  // Token-authenticated photo download (no session required).
  // -----------------------------------------------------------------------
  app.get('/v1/remote-consults/:assessmentId/photos/:photoIndex/download', async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
    }
    const { assessmentId, photoIndex: rawIdx } = request.params as { assessmentId: string; photoIndex: string };
    const photoIndex = parseInt(rawIdx, 10);

    const verified = verifyPhotoToken(token);
    if (!verified || verified.assessmentId !== assessmentId || verified.photoIndex !== photoIndex) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' } });
    }

    const result = await rcService.streamPhoto(token);
    if (!result) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Photo not found' } });
    }

    reply.header('Content-Type', result.mimeType);
    reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(result.filename)}"`);
    reply.header('Cache-Control', 'private, max-age=900');
    return reply.send(result.buffer);
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/remote-consults  — list (clinic member)
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/remote-consults', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!(await allowed(authorization, params.data.clinicId))) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR' } });

    const result = await rcService.listAssessments(params.data.clinicId, query.data);
    return reply.send({ success: true, ...result });
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/remote-consults/:assessmentId  — detail
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/remote-consults/:assessmentId', async (request, reply) => {
    const params = assessmentParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!(await allowed(authorization, params.data.clinicId))) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    const assessment = await rcService.getAssessment(params.data.clinicId, params.data.assessmentId);
    if (!assessment) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });
    return reply.send({ success: true, data: assessment });
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/remote-consults/:assessmentId/photos/:photoIndex/url
  // Generate signed photo URL.
  // -----------------------------------------------------------------------
  app.get(
    '/v1/clinic/:clinicId/remote-consults/:assessmentId/photos/:photoIndex/url',
    async (request, reply) => {
      const params = photoParamsSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

      const authorization = await resolveRequestAuthorization(request, auth);
      if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
      if (!(await allowed(authorization, params.data.clinicId))) {
        return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
      }

      try {
        const result = await rcService.generatePhotoUrl(
          params.data.clinicId,
          params.data.assessmentId,
          params.data.photoIndex,
        );
        // Rewrite /v1/ → /api/ for web proxy
        const downloadUrl = result.downloadUrl.replace(/^\/v1\//, '/api/');
        return reply.send({ success: true, data: { downloadUrl } });
      } catch (err) {
        if (err instanceof RemoteConsultError) {
          return reply.status(rcErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  // -----------------------------------------------------------------------
  // PATCH /v1/clinic/:clinicId/remote-consults/:assessmentId/review
  // Dentist submits their assessment. Dentist role only.
  // -----------------------------------------------------------------------
  app.patch('/v1/clinic/:clinicId/remote-consults/:assessmentId/review', async (request, reply) => {
    const params = assessmentParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!(await allowed(authorization, params.data.clinicId, ['dentist', 'clinic_owner', 'clinic_admin']))) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Dentist role required to review assessments' } });
    }

    const body = reviewBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message } });
    }

    try {
      await rcService.reviewAssessment(
        params.data.clinicId,
        params.data.assessmentId,
        authorization.user.id,
        body.data,
      );
      return reply.send({ success: true });
    } catch (err) {
      if (err instanceof RemoteConsultError) {
        return reply.status(rcErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // -----------------------------------------------------------------------
  // PATCH /v1/clinic/:clinicId/remote-consults/:assessmentId/close
  // -----------------------------------------------------------------------
  app.patch('/v1/clinic/:clinicId/remote-consults/:assessmentId/close', async (request, reply) => {
    const params = assessmentParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!(await allowed(authorization, params.data.clinicId))) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    }

    try {
      await rcService.closeAssessment(params.data.clinicId, params.data.assessmentId, authorization.user.id);
      return reply.send({ success: true });
    } catch (err) {
      if (err instanceof RemoteConsultError) {
        return reply.status(rcErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });
}
