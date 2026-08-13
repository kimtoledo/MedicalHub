import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { hasClinicAccess } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import type { NotificationChannel, NotificationProvidersService } from '../notifications/providers-service.js';
import { NotificationProviderError } from '../notifications/providers-service.js';
import { postgresUuidSchema } from '../validation.js';

const clinic = z.object({ clinicId: postgresUuidSchema });
const channelParam = clinic.extend({ channel: z.enum(['email', 'sms']) });
const setBody = z.discriminatedUnion('providerName', [
  z.object({ channel: z.literal('email'), providerName: z.literal('sendgrid'), fromAddress: z.string().email(), credential: z.object({ apiKey: z.string().min(10) }).strict() }).strict(),
  z.object({ channel: z.literal('sms'), providerName: z.literal('twilio'), fromAddress: z.string().min(6).max(20), credential: z.object({ accountSid: z.string().min(10), authToken: z.string().min(10) }).strict() }).strict(),
]);

const adminRoles = ['clinic_owner', 'clinic_admin'] as const;

function error(reply: FastifyReply, caught: unknown) {
  if (caught instanceof NotificationProviderError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } });
  throw caught;
}
async function authorize(request: FastifyRequest, reply: FastifyReply, auth: AuthServices, clinicId: string) {
  const context = await resolveRequestAuthorization(request, auth);
  if (!context) { await reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } }); return null; }
  if (!hasClinicAccess(context, clinicId, [...adminRoles])) { await reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic Owner or Admin access is required' } }); return null; }
  return context;
}
function actor(request: FastifyRequest, context: { user: { id: string; email: string } }) { return { id: context.user.id, email: context.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }

export async function registerNotificationProviderRoutes(app: FastifyInstance, options: { auth: AuthServices; providers: NotificationProvidersService }) {
  app.get('/v1/clinic/:clinicId/notification-providers', async (request, reply) => {
    const p = clinic.safeParse(request.params);
    if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic identifier' } });
    const context = await authorize(request, reply, options.auth, p.data.clinicId); if (!context) return;
    return reply.send({ success: true, data: await options.providers.status(p.data.clinicId) });
  });
  app.put('/v1/clinic/:clinicId/notification-providers', async (request, reply) => {
    const p = clinic.safeParse(request.params);
    const b = setBody.safeParse(request.body);
    if (!p.success || !b.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid provider configuration' } });
    const context = await authorize(request, reply, options.auth, p.data.clinicId); if (!context) return;
    const data = b.data as { channel: NotificationChannel; providerName: 'sendgrid' | 'twilio'; fromAddress: string; credential: Record<string, string> };
    try { return reply.status(201).send({ success: true, data: await options.providers.setProvider(p.data.clinicId, data.channel, data.providerName, data.credential, data.fromAddress, actor(request, context)) }); } catch (caught) { return error(reply, caught); }
  });
  app.delete('/v1/clinic/:clinicId/notification-providers/:channel', async (request, reply) => {
    const p = channelParam.safeParse(request.params);
    if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid channel' } });
    const context = await authorize(request, reply, options.auth, p.data.clinicId); if (!context) return;
    try { return reply.send({ success: true, data: await options.providers.removeProvider(p.data.clinicId, p.data.channel, actor(request, context)) }); } catch (caught) { return error(reply, caught); }
  });
}
