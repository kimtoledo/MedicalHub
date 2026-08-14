import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ClinicBrandingError, type ClinicBrandingService } from '../clinic/branding-service.js';
import { hasClinicAccess } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import { postgresUuidSchema } from '../validation.js';

const clinicParams = z.object({ clinicId: postgresUuidSchema });
const publicParams = z.object({ clinicId: postgresUuidSchema, kind: z.enum(['logo', 'cover']) });
const coverModeBody = z.object({ coverMode: z.enum(['image', 'gradient']) }).strict();

function brandingErrorStatus(err: ClinicBrandingError): number {
  return err.code === 'NOT_FOUND' ? 404 : err.code === 'INVALID_TYPE' ? 422 : err.code === 'TOO_LARGE' ? 413 : 502;
}

export async function registerClinicBrandingRoutes(
  app: FastifyInstance,
  options: { auth: AuthServices; branding: ClinicBrandingService },
) {
  const authorize = async (request: FastifyRequest, reply: FastifyReply, clinicId: string) => {
    const auth = await resolveRequestAuthorization(request, options.auth);
    if (!auth) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
      return null;
    }
    if (!hasClinicAccess(auth, clinicId, ['clinic_owner', 'clinic_admin'])) {
      reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic Owner or Admin access is required' } });
      return null;
    }
    return auth;
  };

  const uploadHandler = (kind: 'logo' | 'cover') => async (request: FastifyRequest, reply: FastifyReply) => {
    const params = clinicParams.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic identifier' } });
    }
    const auth = await authorize(request, reply, params.data.clinicId);
    if (!auth) return;

    let buffer: Buffer | null = null;
    let mimeType = 'application/octet-stream';

    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          buffer = await part.toBuffer();
          mimeType = part.mimetype;
        }
      }
    } catch {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid multipart request' } });
    }

    if (!buffer) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'No image was provided' } });
    }

    try {
      const result = await options.branding.uploadImage(
        params.data.clinicId,
        kind,
        { buffer, mimeType, sizeBytes: buffer.byteLength },
        { id: auth.user.id, email: auth.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] },
      );
      return reply.status(201).send({ success: true, data: result });
    } catch (error) {
      if (error instanceof ClinicBrandingError) {
        return reply.status(brandingErrorStatus(error)).send({ success: false, error: { code: error.code, message: error.message } });
      }
      throw error;
    }
  };

  app.post('/v1/clinic/:clinicId/branding/logo', uploadHandler('logo'));
  app.post('/v1/clinic/:clinicId/branding/cover', uploadHandler('cover'));

  app.patch('/v1/clinic/:clinicId/branding/cover-mode', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    const body = coverModeBody.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid cover mode' } });
    }
    const auth = await authorize(request, reply, params.data.clinicId);
    if (!auth) return;

    try {
      const result = await options.branding.setCoverMode(
        params.data.clinicId,
        body.data.coverMode,
        { id: auth.user.id, email: auth.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] },
      );
      return reply.send({ success: true, data: result });
    } catch (error) {
      if (error instanceof ClinicBrandingError) {
        return reply.status(brandingErrorStatus(error)).send({ success: false, error: { code: error.code, message: error.message } });
      }
      throw error;
    }
  });

  // Public, unauthenticated — must load on a logged-out visitor's page.
  // Tenant-scoped by clinicId in the path; no cross-clinic leakage since the
  // storage key and DB lookup are both scoped to this clinicId only.
  app.get('/v1/public/clinics/:clinicId/branding/:kind', async (request, reply) => {
    const params = publicParams.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid branding request' } });
    }

    const result = await options.branding.streamImage(params.data.clinicId, params.data.kind);
    if (!result) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } });
    }

    reply.header('Content-Type', result.mimeType);
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    return reply.send(result.buffer);
  });
}
