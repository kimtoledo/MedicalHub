import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AuthServices, AuthorizationContext } from '../auth/types.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AccountProfileService } from '../profile/service.js';
import { AccountProfileError } from '../profile/service.js';

const nullablePhone = z.union([
  z.string().trim().min(7).max(20).regex(/^[0-9+(). -]+$/, 'Enter a valid phone number'),
  z.null(),
]);

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: nullablePhone,
  avatarUrl: z.union([
    z.string().trim().url().max(500).regex(/^https:\/\//i, 'Avatar URL must use HTTPS'),
    z.null(),
  ]),
}).strict();

function error(reply: FastifyReply, status: number, code: string, message: string) {
  return reply.status(status).send({ success: false, error: { code, message } });
}

async function authorizeClinicMember(
  request: FastifyRequest,
  reply: FastifyReply,
  auth: AuthServices,
): Promise<AuthorizationContext | null> {
  const authorization = await resolveRequestAuthorization(request, auth);
  if (!authorization) {
    error(reply, 401, 'UNAUTHENTICATED', 'A valid session is required');
    return null;
  }
  if (!authorization.strategies.includes('clinicMember') || !authorization.clinicMemberships[0]) {
    error(reply, 403, 'FORBIDDEN', 'An active clinic membership is required');
    return null;
  }
  return authorization;
}

export async function registerProfileRoutes(
  app: FastifyInstance,
  options: { auth: AuthServices; profiles: AccountProfileService },
): Promise<void> {
  app.get('/v1/profile', async (request, reply) => {
    const authorization = await authorizeClinicMember(request, reply, options.auth);
    if (!authorization) return;
    const profile = await options.profiles.get(authorization.user.id);
    if (!profile) return error(reply, 404, 'PROFILE_NOT_FOUND', 'Account profile not found');
    return reply.send({ success: true, data: profile });
  });

  app.patch('/v1/profile', async (request, reply) => {
    const authorization = await authorizeClinicMember(request, reply, options.auth);
    if (!authorization) return;
    const body = updateSchema.safeParse(request.body);
    if (!body.success) {
      return error(reply, 400, 'VALIDATION_ERROR', 'Enter valid profile details');
    }

    try {
      const profile = await options.profiles.update(
        authorization.user.id,
        body.data,
        {
          id: authorization.user.id,
          email: authorization.user.email,
          clinicId: authorization.clinicMemberships[0]!.clinicId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      );
      return reply.send({ success: true, data: profile });
    } catch (caught) {
      if (caught instanceof AccountProfileError) {
        return error(reply, caught.statusCode, caught.code, caught.message);
      }
      throw caught;
    }
  });
}
