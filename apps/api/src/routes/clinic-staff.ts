import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ClinicRole, FeatureKey, PermissionKey } from '@dentra/shared';
import { getClinicAccess } from '../auth/authorization.js';
import type { AuthServices, AuthorizationContext } from '../auth/types.js';
import { requireClinicFeature } from '../clinic/access.js';
import { ClinicStaffError, type ClinicStaffService, type StaffActor } from '../clinic/staff-service.js';
import type { EntitlementService } from '../entitlements/service.js';
import { postgresUuidSchema } from '../validation.js';

const clinicParams = z.object({ clinicId: postgresUuidSchema });
const memberParams = z.object({ clinicId: postgresUuidSchema, membershipId: postgresUuidSchema });
const roles = Object.values(ClinicRole) as [string, ...string[]];
const permissions = Object.values(PermissionKey) as [string, ...string[]];
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
const permissionBody = z.object({ permissionKey: z.enum(permissions), isEnabled: z.boolean() }).strict();
const branchAssignmentBody = z.object({ userId: postgresUuidSchema, branchId: postgresUuidSchema }).strict();
const adminRoles = ['clinic_owner', 'clinic_admin'] as const;

function actor(request: FastifyRequest, auth: AuthorizationContext, clinicId: string): StaffActor {
  const role = getClinicAccess(auth, clinicId).find((item) => adminRoles.includes(item.role as typeof adminRoles[number]))?.role;
  if (role !== 'clinic_owner' && role !== 'clinic_admin') throw new Error('Clinic administrator role required');
  return { id: auth.user.id, email: auth.user.email, role, ipAddress: request.ip, userAgent: request.headers['user-agent'] };
}

function sendError(reply: FastifyReply, caught: unknown) {
  if (caught instanceof ClinicStaffError) {
    return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } });
  }
  throw caught;
}

export async function registerClinicStaffRoutes(app: FastifyInstance, options: {
  auth: AuthServices;
  entitlements: EntitlementService;
  staff: ClinicStaffService;
}) {
  app.get('/v1/clinic/:clinicId/staff', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic ID' } });
    if (!await requireClinicFeature(request, reply, options, params.data.clinicId, FeatureKey.STAFF_MANAGE, [...adminRoles])) return;
    return reply.send({ success: true, data: await options.staff.list(params.data.clinicId) });
  });

  app.post('/v1/clinic/:clinicId/staff/invitations', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    const body = inviteBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid staff invitation' } });
    const auth = await requireClinicFeature(request, reply, options, params.data.clinicId, FeatureKey.STAFF_MANAGE, [...adminRoles]);
    if (!auth) return;
    try {
      const data = await options.staff.invite(params.data.clinicId, body.data as Parameters<ClinicStaffService['invite']>[1], actor(request, auth, params.data.clinicId));
      return reply.status(201).send({ success: true, data });
    } catch (caught) { return sendError(reply, caught); }
  });

  app.post('/v1/clinic/:clinicId/staff/:membershipId/resend-invite', async (request, reply) => {
    const params = memberParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid membership ID' } });
    const auth = await requireClinicFeature(request, reply, options, params.data.clinicId, FeatureKey.STAFF_MANAGE, [...adminRoles]);
    if (!auth) return;
    try { return reply.send({ success: true, data: await options.staff.resendInvite(params.data.clinicId, params.data.membershipId, actor(request, auth, params.data.clinicId)) }); }
    catch (caught) { return sendError(reply, caught); }
  });

  app.patch('/v1/clinic/:clinicId/staff/:membershipId', async (request, reply) => {
    const params = memberParams.safeParse(request.params);
    const body = updateBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid staff change' } });
    const auth = await requireClinicFeature(request, reply, options, params.data.clinicId, FeatureKey.STAFF_MANAGE, [...adminRoles]);
    if (!auth) return;
    try { return reply.send({ success: true, data: await options.staff.update(params.data.clinicId, params.data.membershipId, body.data as Parameters<ClinicStaffService['update']>[2], actor(request, auth, params.data.clinicId)) }); }
    catch (caught) { return sendError(reply, caught); }
  });

  app.delete('/v1/clinic/:clinicId/staff/:membershipId', async (request, reply) => {
    const params = memberParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid membership ID' } });
    const auth = await requireClinicFeature(request, reply, options, params.data.clinicId, FeatureKey.STAFF_MANAGE, [...adminRoles]);
    if (!auth) return;
    try { return reply.send({ success: true, data: await options.staff.remove(params.data.clinicId, params.data.membershipId, actor(request, auth, params.data.clinicId)) }); }
    catch (caught) { return sendError(reply, caught); }
  });

  app.post('/v1/clinic/:clinicId/staff/branch-assignments', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    const body = branchAssignmentBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid branch assignment' } });
    const auth = await requireClinicFeature(request, reply, options, params.data.clinicId, FeatureKey.STAFF_MANAGE, [...adminRoles]);
    if (!auth) return;
    try { return reply.status(201).send({ success: true, data: await options.staff.addBranchAssignment(params.data.clinicId, body.data.userId, body.data.branchId, actor(request, auth, params.data.clinicId)) }); }
    catch (caught) { return sendError(reply, caught); }
  });

  app.patch('/v1/clinic/:clinicId/staff/:membershipId/permissions', async (request, reply) => {
    const params = memberParams.safeParse(request.params);
    const body = permissionBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid permission change' } });
    const auth = await requireClinicFeature(request, reply, options, params.data.clinicId, FeatureKey.ROLES_MANAGE, [...adminRoles]);
    if (!auth) return;
    try { return reply.send({ success: true, data: await options.staff.updatePermission(params.data.clinicId, params.data.membershipId, body.data.permissionKey, body.data.isEnabled, actor(request, auth, params.data.clinicId)) }); }
    catch (caught) { return sendError(reply, caught); }
  });
}
