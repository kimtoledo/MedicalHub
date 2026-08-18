import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import { normalizePrcLicense } from '../dentists/prc-license.js';
import { DentistProfileError, type DentistProfileService } from '../profile/dentist-profile-service.js';
import { postgresUuidSchema } from '../validation.js';

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const body = z.object({ bio: nullableText(5000), specialty: nullableText(200), phone: nullableText(20), email: z.string().trim().email().max(255).nullable(), photoUrl: z.string().trim().url().max(500).refine((url) => url.startsWith('https://'), 'Photo URL must use HTTPS').nullable(), licenseNumber: z.string().trim().min(3).max(50).transform((value) => normalizePrcLicense(value)).nullable() }).strict();
const branchIdQuery = z.object({ branchId: postgresUuidSchema });
const scheduleBody = z.object({ rows: z.array(z.object({ weekday: z.number().int().min(0).max(6), startsAt: z.number().int().min(0).max(1439), endsAt: z.number().int().min(1).max(1440) })).max(7) }).strict();
const timeOffBody = z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().trim().max(500).nullable().optional() }).strict();
function dentistIdentity(auth: NonNullable<Awaited<ReturnType<typeof resolveRequestAuthorization>>>) { return auth.clinicMemberships.find((membership) => membership.role === 'dentist' && membership.dentistId); }
function error(reply: FastifyReply, caught: unknown) { if (caught instanceof DentistProfileError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; }
function actor(request: FastifyRequest, auth: NonNullable<Awaited<ReturnType<typeof resolveRequestAuthorization>>>, clinicId: string) { return { id: auth.user.id, email: auth.user.email, clinicId, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }

export async function registerDentistProfileRoutes(app: FastifyInstance, options: { auth: AuthServices; profiles: DentistProfileService }) {
  app.get('/v1/dentist/profile', async (request, reply) => {
    const auth = await resolveRequestAuthorization(request, options.auth); if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    const membership = dentistIdentity(auth); if (!membership?.dentistId) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } });
    try { return reply.send({ success: true, data: await options.profiles.get(membership.dentistId) }); } catch (caught) { return error(reply, caught); }
  });
  app.patch('/v1/dentist/profile', async (request, reply) => {
    const parsed = body.safeParse(request.body); if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid professional profile details' } });
    const auth = await resolveRequestAuthorization(request, options.auth); if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    const membership = dentistIdentity(auth); if (!membership?.dentistId) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } });
    try { return reply.send({ success: true, data: await options.profiles.update(membership.dentistId, parsed.data, actor(request, auth, membership.clinicId)) }); } catch (caught) { return error(reply, caught); }
  });
  app.get('/v1/dentist/schedule', async (request, reply) => {
    const query = branchIdQuery.safeParse(request.query); if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A branchId is required' } });
    const auth = await resolveRequestAuthorization(request, options.auth); if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    const membership = dentistIdentity(auth); if (!membership?.dentistId) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } });
    try { return reply.send({ success: true, data: await options.profiles.getSchedule(membership.dentistId, query.data.branchId) }); } catch (caught) { return error(reply, caught); }
  });
  app.put('/v1/dentist/schedule', async (request, reply) => {
    const query = branchIdQuery.safeParse(request.query); const parsed = scheduleBody.safeParse(request.body);
    if (!query.success || !parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid working-hours schedule' } });
    const auth = await resolveRequestAuthorization(request, options.auth); if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    const membership = dentistIdentity(auth); if (!membership?.dentistId) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } });
    try { return reply.send({ success: true, data: await options.profiles.setSchedule(membership.dentistId, query.data.branchId, parsed.data.rows, actor(request, auth, membership.clinicId)) }); } catch (caught) { return error(reply, caught); }
  });
  app.get('/v1/dentist/time-off', async (request, reply) => {
    const auth = await resolveRequestAuthorization(request, options.auth); if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    const membership = dentistIdentity(auth); if (!membership?.dentistId) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } });
    try { return reply.send({ success: true, data: await options.profiles.listTimeOff(membership.dentistId) }); } catch (caught) { return error(reply, caught); }
  });
  app.post('/v1/dentist/time-off', async (request, reply) => {
    const parsed = timeOffBody.safeParse(request.body); if (!parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid time off request' } });
    const auth = await resolveRequestAuthorization(request, options.auth); if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    const membership = dentistIdentity(auth); if (!membership?.dentistId) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } });
    try { return reply.status(201).send({ success: true, data: await options.profiles.addTimeOff(membership.dentistId, { startDate: parsed.data.startDate, endDate: parsed.data.endDate, reason: parsed.data.reason ?? null }, actor(request, auth, membership.clinicId)) }); } catch (caught) { return error(reply, caught); }
  });
  app.delete('/v1/dentist/time-off/:timeOffId', async (request, reply) => {
    const params = z.object({ timeOffId: postgresUuidSchema }).safeParse(request.params); if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid time off entry' } });
    const auth = await resolveRequestAuthorization(request, options.auth); if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    const membership = dentistIdentity(auth); if (!membership?.dentistId) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } });
    try { return reply.send({ success: true, data: await options.profiles.removeTimeOff(membership.dentistId, params.data.timeOffId, actor(request, auth, membership.clinicId)) }); } catch (caught) { return error(reply, caught); }
  });
}
