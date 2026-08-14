import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ClinicRole } from '@dentra/shared';
import { isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices, AuthorizationContext } from '../auth/types.js';
import { ClinicStaffError, type ClinicStaffService, type StaffActor } from '../clinic/staff-service.js';
import { postgresUuidSchema } from '../validation.js';

const clinicParams = z.object({ clinicId: postgresUuidSchema });
const memberParams = z.object({ clinicId: postgresUuidSchema, membershipId: postgresUuidSchema });
const roles = Object.values(ClinicRole) as [string, ...string[]];
const inviteBody = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255),
  role: z.enum(roles),
  branchId: postgresUuidSchema.nullable(),
}).strict();
const updateBody = z.object({
  role: z.enum(roles).optional(),
  branchId: postgresUuidSchema.nullable().optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one change is required');

/**
 * A Super Admin isn't a member of the target clinic, so there's no clinic
 * membership to derive a role from. Acting with 'clinic_owner' satisfies
 * every owner-gated check in ClinicStaffService; the service's self-checks
 * (userId === actor.id) are never triggered since a super admin's user id
 * never matches a clinic staff member's.
 */
function superAdminActor(request: FastifyRequest, auth: AuthorizationContext): StaffActor {
  return { id: auth.user.id, email: auth.user.email, role: 'clinic_owner', ipAddress: request.ip, userAgent: request.headers['user-agent'] };
}

function sendError(reply: FastifyReply, caught: unknown) {
  if (caught instanceof ClinicStaffError) {
    return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } });
  }
  throw caught;
}

export async function registerAdminClinicStaffRoutes(app: FastifyInstance, options: {
  auth: AuthServices;
  staff: ClinicStaffService;
}) {
  async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<AuthorizationContext | null> {
    const authorization = await resolveRequestAuthorization(request, options.auth);
    if (!authorization) {
      await reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
      return null;
    }
    if (!isSuperAdmin(authorization)) {
      await reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } });
      return null;
    }
    return authorization;
  }

  app.get('/v1/admin/clinics/:clinicId/staff', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic ID' } });
    if (!await requireSuperAdmin(request, reply)) return;
    return reply.send({ success: true, data: await options.staff.list(params.data.clinicId) });
  });

  app.post('/v1/admin/clinics/:clinicId/staff/invitations', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    const body = inviteBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid staff invitation' } });
    const auth = await requireSuperAdmin(request, reply);
    if (!auth) return;
    try {
      const data = await options.staff.invite(params.data.clinicId, body.data as Parameters<ClinicStaffService['invite']>[1], superAdminActor(request, auth));
      return reply.status(201).send({ success: true, data });
    } catch (caught) { return sendError(reply, caught); }
  });

  app.patch('/v1/admin/clinics/:clinicId/staff/:membershipId', async (request, reply) => {
    const params = memberParams.safeParse(request.params);
    const body = updateBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid staff change' } });
    const auth = await requireSuperAdmin(request, reply);
    if (!auth) return;
    try { return reply.send({ success: true, data: await options.staff.update(params.data.clinicId, params.data.membershipId, body.data as Parameters<ClinicStaffService['update']>[2], superAdminActor(request, auth)) }); }
    catch (caught) { return sendError(reply, caught); }
  });

  app.delete('/v1/admin/clinics/:clinicId/staff/:membershipId', async (request, reply) => {
    const params = memberParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid membership ID' } });
    const auth = await requireSuperAdmin(request, reply);
    if (!auth) return;
    try { return reply.send({ success: true, data: await options.staff.remove(params.data.clinicId, params.data.membershipId, superAdminActor(request, auth)) }); }
    catch (caught) { return sendError(reply, caught); }
  });
}
