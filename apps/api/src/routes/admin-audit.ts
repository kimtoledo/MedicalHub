import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AdminAuditService } from '../admin/audit-service.js';
import { isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00+08:00`)));

const querySchema = z.object({
  actor: z.string().trim().max(100).default(''),
  action: z.string().trim().max(100).optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).refine(
  (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
  { message: 'dateFrom must be on or before dateTo' },
);

const manilaStart = (date: string) => new Date(`${date}T00:00:00+08:00`);

export async function registerAdminAuditRoutes(
  app: FastifyInstance,
  options: { auth: AuthServices; audit: AdminAuditService },
) {
  app.get('/v1/admin/audit', async (request, reply) => {
    const auth = await resolveRequestAuthorization(request, options.auth);
    if (!auth) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' },
      });
    }
    if (!isSuperAdmin(auth)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Super Admin access is required' },
      });
    }

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid audit filters' },
      });
    }

    const dateToExclusive = parsed.data.dateTo
      ? new Date(manilaStart(parsed.data.dateTo).getTime() + 86_400_000)
      : undefined;
    return reply.send({
      success: true,
      data: await options.audit.list({
        actor: parsed.data.actor,
        action: parsed.data.action || undefined,
        dateFrom: parsed.data.dateFrom
          ? manilaStart(parsed.data.dateFrom)
          : undefined,
        dateToExclusive,
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
      }),
    });
  });
}
