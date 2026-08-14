import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { z } from 'zod';
import { isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import { PlatformSettingsError, type PlatformSettingsService } from '../admin/platform-settings-service.js';

const updateBody = z.object({
  supportEmail: z.string().trim().email().max(255).nullable().optional(),
  supportPhone: z.string().trim().max(50).nullable().optional(),
  maintenanceBannerEnabled: z.boolean().optional(),
  maintenanceBannerMessage: z.string().trim().max(500).nullable().optional(),
}).strict();
const revokeBody = z.object({ token: z.string().min(10) }).strict();

function actor(request: FastifyRequest, context: { user: { id: string; email: string } }) {
  return { id: context.user.id, email: context.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] };
}

async function adminAuth(request: FastifyRequest, reply: FastifyReply, auth: AuthServices) {
  const context = await resolveRequestAuthorization(request, auth);
  if (!context) { await reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } }); return null; }
  if (!isSuperAdmin(context)) { await reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } }); return null; }
  return context;
}

export async function registerAdminSettingsRoutes(app: FastifyInstance, options: { auth: AuthServices; settings: PlatformSettingsService }) {
  app.get('/v1/admin/settings/runtime', async (request, reply) => {
    const context = await adminAuth(request, reply, options.auth);
    if (!context) return;
    return reply.send({ success: true, data: await options.settings.runtimeSummary() });
  });

  app.get('/v1/admin/settings/platform', async (request, reply) => {
    const context = await adminAuth(request, reply, options.auth);
    if (!context) return;
    return reply.send({ success: true, data: await options.settings.get() });
  });

  app.patch('/v1/admin/settings/platform', async (request, reply) => {
    const body = updateBody.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message ?? 'Invalid settings update' } });
    const context = await adminAuth(request, reply, options.auth);
    if (!context) return;
    try {
      return reply.send({ success: true, data: await options.settings.update(body.data, actor(request, context)) });
    } catch (caught) {
      if (caught instanceof PlatformSettingsError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } });
      throw caught;
    }
  });

  app.get('/v1/admin/settings/sessions', async (request, reply) => {
    const context = await adminAuth(request, reply, options.auth);
    if (!context) return;
    if (!options.auth.listSessions) return reply.status(501).send({ success: false, error: { code: 'NOT_SUPPORTED', message: 'Session listing is not available' } });
    const sessions = await options.auth.listSessions(fromNodeHeaders(request.headers));
    return reply.send({ success: true, data: sessions });
  });

  app.post('/v1/admin/settings/sessions/revoke', async (request, reply) => {
    const body = revokeBody.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A session token is required' } });
    const context = await adminAuth(request, reply, options.auth);
    if (!context) return;
    if (!options.auth.revokeSession) return reply.status(501).send({ success: false, error: { code: 'NOT_SUPPORTED', message: 'Session revocation is not available' } });
    await options.auth.revokeSession(fromNodeHeaders(request.headers), body.data.token);
    return reply.send({ success: true });
  });

  app.post('/v1/admin/settings/sessions/revoke-others', async (request, reply) => {
    const context = await adminAuth(request, reply, options.auth);
    if (!context) return;
    if (!options.auth.revokeOtherSessions) return reply.status(501).send({ success: false, error: { code: 'NOT_SUPPORTED', message: 'Session revocation is not available' } });
    await options.auth.revokeOtherSessions(fromNodeHeaders(request.headers));
    return reply.send({ success: true });
  });
}
