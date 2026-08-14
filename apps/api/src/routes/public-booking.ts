import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { PublicBookingService } from '../public/booking-service.js';
import { PublicBookingError } from '../public/booking-service.js';
import { postgresUuidSchema } from '../validation.js';

const slug = z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(new Date(`${value}T00:00:00+08:00`).getTime()), 'Invalid date');
const selection = z.object({ branchId: postgresUuidSchema, serviceId: postgresUuidSchema, dentistId: postgresUuidSchema.optional(), date });
const booking = selection.extend({ clinicSlug: slug, startsAt: z.string().datetime({ offset: true }), patientFirstName: z.string().trim().min(1).max(100), patientLastName: z.string().trim().min(1).max(100), patientPhone: z.string().trim().min(7).max(20).regex(/^[0-9+()\-\s]+$/), patientEmail: z.string().trim().email().max(255), chiefComplaint: z.string().trim().min(2).max(1000), agreedToTerms: z.literal(true), recaptchaToken: z.string().min(1) }).strict();

function error(reply: FastifyReply, caught: unknown) {
  if (caught instanceof PublicBookingError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } });
  throw caught;
}

// RECAPTCHA_SECRET_KEY is unset in environments that haven't registered a reCAPTCHA site yet
// (e.g. local dev before keys are generated); skip verification rather than block all bookings.
async function verifyRecaptcha(token: string, remoteIp?: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.set('remoteip', remoteIp);
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: params });
  if (!response.ok) return false;
  const result = (await response.json()) as { success: boolean };
  return result.success === true;
}

export async function registerPublicBookingRoutes(app: FastifyInstance, options: { booking: PublicBookingService }) {
  app.get('/v1/public/clinics/:slug/availability', async (request, reply) => {
    const params = z.object({ slug }).safeParse(request.params); const query = selection.safeParse(request.query);
    if (!params.success || !query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid availability selection' } });
    try { return reply.send({ success: true, data: await options.booking.availability({ clinicSlug: params.data.slug, ...query.data }) }); } catch (caught) { return error(reply, caught); }
  });
  app.post('/v1/public/appointments', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = booking.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please check the appointment details' } });
    const humanVerified = await verifyRecaptcha(body.data.recaptchaToken, request.ip);
    if (!humanVerified) return reply.status(400).send({ success: false, error: { code: 'RECAPTCHA_FAILED', message: 'reCAPTCHA verification failed. Please try again.' } });
    try { const data = await options.booking.book(body.data, { ipAddress: request.ip, userAgent: request.headers['user-agent'] }); return reply.status(201).send({ success: true, data }); } catch (caught) { return error(reply, caught); }
  });
}
