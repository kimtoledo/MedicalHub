import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { hasClinicAccess } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import type { OrganizationService } from '../organizations/service.js';
import { OrganizationError } from '../organizations/service.js';
import { postgresUuidSchema } from '../validation.js';

const create = z.object({ name: z.string().trim().min(2).max(200), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), clinicId: postgresUuidSchema }).strict();
const org = z.object({ organizationId: postgresUuidSchema });
const attach = z.object({ clinicId: postgresUuidSchema }).strict();
const member = z.object({ email: z.string().trim().toLowerCase().email().max(255), role: z.enum(['owner', 'admin', 'regional_manager', 'viewer']), branchIds: z.array(postgresUuidSchema).max(100).default([]) }).strict();
const actor = (request: FastifyRequest, auth: { user: { id: string; email: string } }) => ({ id: auth.user.id, email: auth.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
const sendError = (reply: any, caught: unknown) => { if (caught instanceof OrganizationError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; };

export async function registerOrganizationRoutes(app: FastifyInstance, options: { auth: AuthServices; organizations: OrganizationService }) {
  app.post('/v1/organizations', async (request, reply) => {
    const body = create.safeParse(request.body); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid organization' } });
    if (!auth || !hasClinicAccess(auth, body.data.clinicId, ['clinic_owner', 'clinic_admin'])) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic administrator access is required' } });
    try { return reply.status(201).send({ success: true, data: await options.organizations.create(body.data, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.get('/v1/organizations', async (request, reply) => {
    const auth = await resolveRequestAuthorization(request, options.auth);
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    return reply.send({ success: true, data: await options.organizations.listMine(auth.user.id) });
  });
  app.get('/v1/organizations/eligible-clinics', async (request, reply) => {
    const auth = await resolveRequestAuthorization(request, options.auth);
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    return reply.send({ success: true, data: await options.organizations.eligibleClinics(auth.user.id) });
  });
  app.get('/v1/organizations/:organizationId/workspace', async (request, reply) => {
    const params = org.safeParse(request.params); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid organization' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.send({ success: true, data: await options.organizations.workspace(params.data.organizationId, auth.user.id) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.post('/v1/organizations/:organizationId/clinics', async (request, reply) => {
    const params = org.safeParse(request.params); const body = attach.safeParse(request.body); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid organization clinic link' } });
    if (!auth || !hasClinicAccess(auth, body.data.clinicId, ['clinic_owner', 'clinic_admin'])) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You must administer the clinic being attached' } });
    try { return reply.status(201).send({ success: true, data: await options.organizations.attachClinic(params.data.organizationId, body.data.clinicId, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.get('/v1/organizations/:organizationId/report', async (request, reply) => {
    const params = org.safeParse(request.params); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid organization request' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.send({ success: true, data: await options.organizations.report(params.data.organizationId, auth.user.id) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.post('/v1/organizations/:organizationId/members', async (request, reply) => {
    const params = org.safeParse(request.params); const body = member.safeParse(request.body); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.success ? 'Invalid organization' : body.error.issues[0]?.message ?? 'Invalid member' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.send({ success: true, data: await options.organizations.upsertMember(params.data.organizationId, body.data, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
}
