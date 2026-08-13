import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getClinicAccess, hasClinicAccess, isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices, AuthorizationContext } from '../auth/types.js';
import type { VerificationService, VerificationUpload } from '../verification/service.js';
import { VerificationError } from '../verification/service.js';
import { postgresUuidSchema } from '../validation.js';

const clinicParams = z.object({ clinicId: postgresUuidSchema });
const submissionParams = z.object({ submissionId: postgresUuidSchema });
const documentParams = z.object({ submissionId: postgresUuidSchema, documentIndex: z.coerce.number().int().min(0).max(4) });
const reviewBody = z.object({ status: z.enum(['approved', 'rejected', 'revoked']), reason: z.string().trim().min(3).max(1000), expiresAt: z.string().datetime({ offset: true }).optional() }).strict();
const adminFilter = z.object({ status: z.enum(['all', 'pending', 'approved', 'rejected', 'revoked', 'expiring']).default('pending') });
const actor = (request: FastifyRequest, auth: { user: { id: string; email: string } }) => ({ id: auth.user.id, email: auth.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
const statusFor = (caught: VerificationError) => caught.statusCode;

function subjectFor(auth: AuthorizationContext, clinicId: string, subjectType: 'dentist' | 'clinic') {
  if (subjectType === 'clinic') return hasClinicAccess(auth, clinicId, ['clinic_owner', 'clinic_admin']) ? { clinicId } : null;
  const membership = getClinicAccess(auth, clinicId).find((item) => item.role === 'dentist' && item.dentistId);
  return membership?.dentistId ? { dentistId: membership.dentistId } : null;
}

export async function registerVerificationRoutes(app: FastifyInstance, options: { auth: AuthServices; verification: VerificationService }) {
  app.get('/v1/clinic/:clinicId/verification', async (request, reply) => {
    const params = clinicParams.safeParse(request.params); const query = z.object({ subjectType: z.enum(['dentist', 'clinic']) }).safeParse(request.query);
    if (!params.success || !query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid verification subject' } });
    const authorization = await resolveRequestAuthorization(request, options.auth);
    if (!authorization || !hasClinicAccess(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    const subject = subjectFor(authorization, params.data.clinicId, query.data.subjectType);
    if (!subject) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot manage this verification subject' } });
    return reply.send({ success: true, data: await options.verification.listForSubject(subject) });
  });

  app.post('/v1/clinic/:clinicId/verification', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic' } });
    const authorization = await resolveRequestAuthorization(request, options.auth);
    if (!authorization || !hasClinicAccess(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access is required' } });
    let subjectType: 'dentist' | 'clinic' | null = null; let types: string[] = []; const files: Array<Omit<VerificationUpload, 'type'>> = [];
    try {
      for await (const part of request.parts()) {
        if (part.type === 'file') { const buffer = await part.toBuffer(); files.push({ buffer, filename: part.filename ?? 'document', mimeType: part.mimetype, sizeBytes: buffer.byteLength }); }
        else if (part.fieldname === 'subjectType' && (part.value === 'clinic' || part.value === 'dentist')) subjectType = part.value;
        else if (part.fieldname === 'documentTypes') types = JSON.parse(String(part.value)) as string[];
      }
    } catch { return reply.status(400).send({ success: false, error: { code: 'INVALID_MULTIPART', message: 'Invalid verification upload' } }); }
    if (!subjectType || !Array.isArray(types) || files.length !== types.length || types.some((item) => typeof item !== 'string' || item.trim().length < 2 || item.length > 50)) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose a type for every attached document' } });
    const subject = subjectFor(authorization, params.data.clinicId, subjectType);
    if (!subject) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot submit for this verification subject' } });
    try { return reply.status(201).send({ success: true, data: await options.verification.submit({ subjectType, ...subject, documents: files.map((file, index) => ({ ...file, type: types[index].trim() })), submittedBy: authorization.user.id }) }); }
    catch (caught) { if (caught instanceof VerificationError) return reply.status(statusFor(caught)).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; }
  });

  app.get('/v1/admin/verifications', async (request, reply) => {
    const authorization = await resolveRequestAuthorization(request, options.auth); const query = adminFilter.safeParse(request.query);
    if (!authorization || !isSuperAdmin(authorization)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } });
    if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid verification filter' } });
    return reply.send({ success: true, data: await options.verification.list(query.data.status) });
  });

  app.get('/v1/admin/verifications/:submissionId', async (request, reply) => {
    const authorization = await resolveRequestAuthorization(request, options.auth); const params = submissionParams.safeParse(request.params);
    if (!authorization || !isSuperAdmin(authorization)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR' } });
    const submission = await options.verification.get(params.data.submissionId);
    return submission ? reply.send({ success: true, data: submission }) : reply.status(404).send({ success: false, error: { code: 'NOT_FOUND' } });
  });

  app.get('/v1/admin/verifications/:submissionId/documents/:documentIndex', async (request, reply) => {
    const authorization = await resolveRequestAuthorization(request, options.auth); const params = documentParams.safeParse(request.params);
    if (!authorization || !isSuperAdmin(authorization)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN' } });
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR' } });
    try { const file = await options.verification.download(params.data.submissionId, params.data.documentIndex); reply.header('Content-Type', file.mimeType); reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`); reply.header('Cache-Control', 'private, no-store'); return reply.send(file.buffer); }
    catch (caught) { if (caught instanceof VerificationError) return reply.status(statusFor(caught)).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; }
  });

  app.patch('/v1/admin/verifications/:submissionId', async (request, reply) => {
    const params = submissionParams.safeParse(request.params); const body = reviewBody.safeParse(request.body); const authorization = await resolveRequestAuthorization(request, options.auth);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A written decision reason is required' } });
    if (!authorization || !isSuperAdmin(authorization)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } });
    try { return reply.send({ success: true, data: await options.verification.review(params.data.submissionId, body.data, actor(request, authorization)) }); }
    catch (caught) { if (caught instanceof VerificationError) return reply.status(statusFor(caught)).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; }
  });
}
