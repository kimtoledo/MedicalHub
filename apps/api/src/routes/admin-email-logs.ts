import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DB } from '@dentra/db';
import { createAdminEmailLogsService, type AdminEmailLogsService } from '../admin/email-logs-service.js';
import { isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import { postgresUuidSchema } from '../validation.js';

const statuses = ['held', 'queued', 'processing', 'sent', 'failed', 'cancelled'] as const;
const types = ['booking_confirmation', 'appointment_reminder', 'appointment_cancelled', 'appointment_rescheduled', 'recall_reminder', 'prescription_share', 'dentist_verification_approved', 'dentist_verification_rejected', 'dentist_verification_revoked'] as const;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const listQuery = z.object({
  search: z.string().trim().max(200).default(''),
  status: z.enum(statuses).optional(),
  type: z.enum(types).optional(),
  dateFrom: dateOnly.optional(),
  dateTo: dateOnly.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
const detailParams = z.object({ emailLogId: postgresUuidSchema });

export async function registerAdminEmailLogRoutes(app: FastifyInstance, options: { auth: AuthServices; db?: DB; emailLogs?: AdminEmailLogsService }) {
  const service = options.emailLogs ?? (options.db ? createAdminEmailLogsService(options.db) : null);
  if (!service) throw new Error('Admin email logs require a database or service');
  async function authorize(request: Parameters<typeof resolveRequestAuthorization>[0]) {
    const auth = await resolveRequestAuthorization(request, options.auth);
    return auth && isSuperAdmin(auth) ? auth : null;
  }

  app.get('/v1/admin/email-logs', async (request, reply) => {
    if (!await authorize(request)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } });
    const query = listQuery.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid email log filters' } });
    const dateFrom = query.data.dateFrom ? new Date(`${query.data.dateFrom}T00:00:00+08:00`) : undefined;
    const dateTo = query.data.dateTo ? new Date(`${query.data.dateTo}T23:59:59.999+08:00`) : undefined;
    return reply.send({ success: true, data: await service.list({ ...query.data, dateFrom, dateTo }) });
  });

  app.get('/v1/admin/email-logs/:emailLogId', async (request, reply) => {
    if (!await authorize(request)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } });
    const params = detailParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid email log identifier' } });
    const row = await service.get(params.data.emailLogId);
    return row ? reply.send({ success: true, data: row }) : reply.status(404).send({ success: false, error: { code: 'EMAIL_LOG_NOT_FOUND', message: 'Email log not found' } });
  });
}
