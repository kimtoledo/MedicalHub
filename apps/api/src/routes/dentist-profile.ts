import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import { DentistProfileError, type DentistProfileService } from '../profile/dentist-profile-service.js';

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const body = z.object({ bio: nullableText(5000), specialty: nullableText(200), phone: nullableText(20), email: z.string().trim().email().max(255).nullable(), photoUrl: z.string().trim().url().max(500).refine((url) => url.startsWith('https://'), 'Photo URL must use HTTPS').nullable(), licenseNumber: nullableText(50) }).strict();
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
}
