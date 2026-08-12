import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { KioskService } from '../kiosk/service.js';
import { KioskError } from '../kiosk/service.js';
import { postgresUuidSchema } from '../validation.js';

const branch = z.object({ branchId: postgresUuidSchema });
const lookup = z.object({ patientNumber: z.string().trim().min(2).max(50).optional(), lastName: z.string().trim().min(2).max(100).optional(), dateOfBirth: z.string().trim().min(4).max(20).optional() }).refine((value) => Boolean(value.patientNumber) || Boolean(value.lastName && value.dateOfBirth), 'Enter a patient number or last name and date of birth').strict();
const checkin = branch.extend({ appointmentId: postgresUuidSchema });
function error(reply: FastifyReply, caught: unknown) { if (caught instanceof KioskError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; }
export async function registerKioskRoutes(app: FastifyInstance, options: { kiosk: KioskService }) {
  app.post('/v1/public/kiosk/:branchId/lookup', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => { const p = branch.safeParse(request.params); const b = lookup.safeParse(request.body); if (!p.success || !b.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a patient number or last name and date of birth' } }); try { return reply.send({ success: true, data: await options.kiosk.lookup(p.data.branchId, b.data) }); } catch (caught) { return error(reply, caught); } });
  app.post('/v1/public/kiosk/:branchId/appointments/:appointmentId/check-in', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => { const p = checkin.safeParse(request.params); const b = lookup.safeParse(request.body); if (!p.success || !b.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Identity confirmation is required' } }); try { return reply.send({ success: true, data: await options.kiosk.checkIn(p.data.branchId, p.data.appointmentId, b.data) }); } catch (caught) { return error(reply, caught); } });
}
