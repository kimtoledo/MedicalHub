import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getClinicAccess, hasClinicAccess, isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthorizationContext, AuthServices } from '../auth/types.js';
import {
  ClinicalFileError,
  verifySignedToken,
  type ClinicFilesService,
} from '../clinic/clinical-files-service.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const clinicParamsSchema = z.object({ clinicId: uuidSchema });
const fileParamsSchema = z.object({ clinicId: uuidSchema, fileId: uuidSchema });

const listFilesQuerySchema = z.object({
  encounterId: uuidSchema.optional(),
  patientId:   uuidSchema.optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const uploadMetaSchema = z.object({
  fileType:    z.enum(['radiograph', 'intraoral_photo', 'extraoral_photo', 'consent_form', 'lab_result', 'referral_letter', 'other']),
  patientId:   uuidSchema,
  encounterId: uuidSchema.optional(),
  branchId:    uuidSchema,
  toothRef:    z.string().trim().max(50).optional(),
  notes:       z.string().trim().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Auth helpers (same pattern as billing / prescriptions)
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

// ---------------------------------------------------------------------------
// Route options
// ---------------------------------------------------------------------------

export type ClinicFilesRoutesOptions = {
  auth: AuthServices;
  filesService: ClinicFilesService;
};

// ---------------------------------------------------------------------------
// Register routes
// ---------------------------------------------------------------------------

export async function registerClinicFilesRoutes(
  app: FastifyInstance,
  options: ClinicFilesRoutesOptions,
): Promise<void> {
  const { auth, filesService } = options;

  function fileErrorStatus(err: ClinicalFileError): number {
    return err.code === 'NOT_FOUND'      ? 404
      : err.code === 'FORBIDDEN'         ? 403
      : err.code === 'INVALID_TYPE'      ? 422
      : err.code === 'TOO_LARGE'         ? 413
      : err.code === 'UPLOAD_FAILED'     ? 502
      : 400;
  }

  // -----------------------------------------------------------------------
  // POST /v1/clinic/:clinicId/files  — upload a clinical file
  // Accepts multipart/form-data with fields: file (binary), plus JSON fields
  // -----------------------------------------------------------------------
  app.post('/v1/clinic/:clinicId/files', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);

    // Parse multipart
    let fileBuffer: Buffer | null = null;
    let originalFilename = 'upload';
    let mimeType = 'application/octet-stream';
    let sizeBytes = 0;
    let metaFields: Record<string, string> = {};

    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          fileBuffer = await part.toBuffer();
          originalFilename = part.filename ?? 'upload';
          mimeType = part.mimetype;
          sizeBytes = fileBuffer.byteLength;
        } else {
          metaFields[part.fieldname] = (part as { value: string }).value;
        }
      }
    } catch {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid multipart request' } });
    }

    if (!fileBuffer) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'No file was provided' } });
    }

    const meta = uploadMetaSchema.safeParse(metaFields);
    if (!meta.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid upload metadata: ' + meta.error.issues.map((i) => i.message).join(', ') } });
    }

    try {
      const result = await filesService.uploadFile(params.data.clinicId, {
        buffer: fileBuffer,
        originalFilename,
        mimeType,
        sizeBytes,
        fileType: meta.data.fileType,
        patientId: meta.data.patientId,
        encounterId: meta.data.encounterId ?? null,
        branchId: meta.data.branchId,
        toothRef: meta.data.toothRef ?? null,
        notes: meta.data.notes ?? null,
        uploadedBy: authorization.user.id,
        callerBranchIds,
      });
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof ClinicalFileError) {
        return reply.status(fileErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/files  — list files
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/files', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const query = listFilesQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query params' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const result = await filesService.listFiles(params.data.clinicId, { ...query.data, callerBranchIds });
    return reply.send({ success: true, ...result });
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/files/:fileId  — get file metadata
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/files/:fileId', async (request, reply) => {
    const params = fileParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const file = await filesService.getFile(params.data.clinicId, params.data.fileId, callerBranchIds);
    if (!file) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
    return reply.send({ success: true, data: file });
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/files/:fileId/url  — generate signed URL
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/files/:fileId/url', async (request, reply) => {
    const params = fileParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);

    try {
      const result = await filesService.generateSignedUrl(
        params.data.clinicId,
        params.data.fileId,
        authorization.user.id,
        callerBranchIds,
      );
      return reply.send({ success: true, data: result });
    } catch (err) {
      if (err instanceof ClinicalFileError) {
        return reply.status(fileErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/files/:fileId/download  — stream file content
  // Validates a short-lived signed token in ?token=. No session required
  // because the token itself is the credential (15-min TTL).
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/files/:fileId/download', async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
    }

    // Verify token matches this fileId / clinicId
    const params = fileParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const verified = verifySignedToken(token);
    if (
      !verified
      || verified.fileId !== params.data.fileId
      || verified.clinicId !== params.data.clinicId
    ) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token is invalid or has expired' } });
    }

    const result = await filesService.streamFile(token);
    if (!result) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
    }

    reply.header('Content-Type', result.mimeType);
    reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(result.filename)}"`);
    reply.header('Cache-Control', 'private, max-age=900');
    return reply.send(result.buffer);
  });

  // -----------------------------------------------------------------------
  // DELETE /v1/clinic/:clinicId/files/:fileId  — delete a file
  // -----------------------------------------------------------------------
  app.delete('/v1/clinic/:clinicId/files/:fileId', async (request, reply) => {
    const params = fileParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);

    try {
      await filesService.deleteFile(params.data.clinicId, params.data.fileId, authorization.user.id, callerBranchIds);
      return reply.send({ success: true });
    } catch (err) {
      if (err instanceof ClinicalFileError) {
        return reply.status(fileErrorStatus(err)).send({ success: false, error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });
}
