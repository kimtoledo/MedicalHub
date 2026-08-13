import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { hasClinicAccess } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import type { IntegrationScope, IntegrationService } from '../integrations/service.js';
import { IntegrationError } from '../integrations/service.js';
import { postgresUuidSchema } from '../validation.js';

const clinic = z.object({ clinicId: postgresUuidSchema });
const keyId = clinic.extend({ keyId: postgresUuidSchema });
const webhookId = clinic.extend({ webhookId: postgresUuidSchema });
const keyBody = z.object({ name: z.string().trim().min(2).max(120), scopes: z.array(z.enum(['appointments.read', 'invoices.read', 'webhooks.manage', 'calendar.feed'])).min(1).max(10) }).strict();
const icsQuery = z.object({ key: z.string().min(10) }).strict();
const webhookBody = z.object({ name: z.string().trim().min(2).max(120), endpointUrl: z.string().url().max(500), eventTypes: z.array(z.string().trim().min(3).max(100)).min(1).max(20) }).strict();
const rangeQuery = z.object({ from: z.string().datetime({ offset: true }).optional(), to: z.string().datetime({ offset: true }).optional() }).strict();
const adminRoles = ['clinic_owner', 'clinic_admin'] as const;

function error(reply: FastifyReply, caught: unknown) {
  if (caught instanceof IntegrationError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } });
  throw caught;
}
async function authorize(request: FastifyRequest, reply: FastifyReply, auth: AuthServices, clinicId: string) {
  const context = await resolveRequestAuthorization(request, auth);
  if (!context) { await reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } }); return null; }
  if (!hasClinicAccess(context, clinicId, [...adminRoles])) { await reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic Owner or Admin access is required' } }); return null; }
  return context;
}
function actor(request: FastifyRequest, context: { user: { id: string; email: string } }) { return { id: context.user.id, email: context.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }
function window(query: z.infer<typeof rangeQuery>) {
  const from = query.from ? new Date(query.from) : new Date();
  const to = query.to ? new Date(query.to) : new Date(from.getTime() + 7 * 86_400_000);
  if (to <= from || to.getTime() - from.getTime() > 31 * 86_400_000) throw new IntegrationError('INVALID_DATE_RANGE', 'Date range must be positive and no longer than 31 days');
  return { from, to };
}
function icsEscape(value: string) { return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n'); }
function icsTimestamp(date: Date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
const ICS_STATUS: Record<string, string> = { cancelled: 'CANCELLED', pending: 'TENTATIVE' };
function icsCalendar(events: Awaited<ReturnType<IntegrationService['appointments']>>) {
  const now = icsTimestamp(new Date());
  const body = events.map((event) => {
    const patientName = [event.patientFirstName, event.patientLastName].filter(Boolean).join(' ').trim();
    const summary = icsEscape([event.serviceName ?? 'Dental appointment', patientName || null].filter(Boolean).join(' — '));
    const location = icsEscape(event.branchName);
    return [
      'BEGIN:VEVENT',
      `UID:${event.id}@dentra.ph`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsTimestamp(event.startsAt)}`,
      `DTEND:${icsTimestamp(event.endsAt ?? new Date(event.startsAt.getTime() + 30 * 60_000))}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `STATUS:${ICS_STATUS[event.status] ?? 'CONFIRMED'}`,
      'END:VEVENT',
    ].join('\r\n');
  }).join('\r\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dentra.ph//Appointments//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', body, 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}

export async function registerIntegrationRoutes(app: FastifyInstance, options: { auth: AuthServices; integrations: IntegrationService }) {
  app.get('/v1/clinic/:clinicId/integrations/api-keys', async (request, reply) => { const p = clinic.safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic identifier' } }); const context = await authorize(request, reply, options.auth, p.data.clinicId); if (!context) return; return reply.send({ success: true, data: await options.integrations.listKeys(p.data.clinicId) }); });
  app.post('/v1/clinic/:clinicId/integrations/api-keys', async (request, reply) => { const p = clinic.safeParse(request.params); const b = keyBody.safeParse(request.body); if (!p.success || !b.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid API key request' } }); const context = await authorize(request, reply, options.auth, p.data.clinicId); if (!context) return; try { return reply.status(201).send({ success: true, data: await options.integrations.createKey(p.data.clinicId, b.data.name, b.data.scopes as IntegrationScope[], actor(request, context)) }); } catch (caught) { return error(reply, caught); } });
  app.post('/v1/clinic/:clinicId/integrations/api-keys/:keyId/revoke', async (request, reply) => { const p = keyId.safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid API key identifier' } }); const context = await authorize(request, reply, options.auth, p.data.clinicId); if (!context) return; try { return reply.send({ success: true, data: await options.integrations.revokeKey(p.data.clinicId, p.data.keyId, actor(request, context)) }); } catch (caught) { return error(reply, caught); } });
  app.get('/v1/clinic/:clinicId/integrations/webhooks', async (request, reply) => { const p = clinic.safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic identifier' } }); const context = await authorize(request, reply, options.auth, p.data.clinicId); if (!context) return; return reply.send({ success: true, data: await options.integrations.listWebhooks(p.data.clinicId) }); });
  app.post('/v1/clinic/:clinicId/integrations/webhooks', async (request, reply) => { const p = clinic.safeParse(request.params); const b = webhookBody.safeParse(request.body); if (!p.success || !b.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook request' } }); const context = await authorize(request, reply, options.auth, p.data.clinicId); if (!context) return; try { return reply.status(201).send({ success: true, data: await options.integrations.createWebhook(p.data.clinicId, b.data, actor(request, context)) }); } catch (caught) { return error(reply, caught); } });
  app.post('/v1/clinic/:clinicId/integrations/webhooks/:webhookId/disable', async (request, reply) => { const p = webhookId.safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook identifier' } }); const context = await authorize(request, reply, options.auth, p.data.clinicId); if (!context) return; try { return reply.send({ success: true, data: await options.integrations.disableWebhook(p.data.clinicId, p.data.webhookId, actor(request, context)) }); } catch (caught) { return error(reply, caught); } });
  app.get('/v1/clinic/:clinicId/integrations/webhooks/:webhookId/deliveries', async (request, reply) => { const p = webhookId.safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook identifier' } }); const context = await authorize(request, reply, options.auth, p.data.clinicId); if (!context) return; return reply.send({ success: true, data: await options.integrations.listDeliveries(p.data.clinicId, p.data.webhookId) }); });
  app.get('/v1/partner/appointments', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (request, reply) => {
    const secret = request.headers['x-dentra-api-key'];
    const apiKey = typeof secret === 'string' ? secret : '';
    const auth = apiKey ? await options.integrations.authenticate(apiKey) : null;
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'INVALID_API_KEY', message: 'A valid integration API key is required' } });
    if (!auth.scopes.includes('appointments.read')) return reply.status(403).send({ success: false, error: { code: 'SCOPE_REQUIRED', message: 'appointments.read scope is required' } });
    const query = rangeQuery.safeParse(request.query); if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid date range' } });
    try { const range = window(query.data); return reply.send({ success: true, data: { clinicId: auth.clinicId, from: range.from.toISOString(), to: range.to.toISOString(), appointments: await options.integrations.appointments(auth.clinicId, range.from, range.to) } }); } catch (caught) { return error(reply, caught); }
  });
  app.get('/v1/partner/calendar/appointments.ics', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const query = icsQuery.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid feed key is required' } });
    const auth = await options.integrations.authenticate(query.data.key);
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'INVALID_API_KEY', message: 'A valid calendar feed key is required' } });
    if (!auth.scopes.includes('calendar.feed')) return reply.status(403).send({ success: false, error: { code: 'SCOPE_REQUIRED', message: 'calendar.feed scope is required' } });
    const from = new Date(Date.now() - 7 * 86_400_000);
    const to = new Date(Date.now() + 60 * 86_400_000);
    const events = await options.integrations.appointments(auth.clinicId, from, to);
    return reply.header('content-type', 'text/calendar; charset=utf-8').header('content-disposition', 'inline; filename="dentra-appointments.ics"').send(icsCalendar(events));
  });
}
