/**
 * Minimal patient routes — detail read.
 * Expanded in a later task when the full patient management UI is built.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { hasClinicAccess, isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthorizationContext, AuthServices } from '../auth/types.js';
import type { DB } from '@dentra/db';
import { patients } from '@dentra/db/schema';

const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const patientParamsSchema = z.object({ clinicId: uuidSchema, patientId: uuidSchema });

function checkClinicAuth(authorization: AuthorizationContext, clinicId: string): boolean {
  if (isSuperAdmin(authorization)) return true;
  return hasClinicAccess(authorization, clinicId);
}

export type ClinicPatientRoutesOptions = {
  auth: AuthServices;
  db: DB;
};

export async function registerClinicPatientRoutes(
  app: FastifyInstance,
  options: ClinicPatientRoutesOptions,
): Promise<void> {
  const { auth, db } = options;

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/patients/:patientId  — patient detail
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/patients/:patientId', async (request, reply) => {
    const params = patientParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const [row] = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.id, params.data.patientId),
          eq(patients.clinicId, params.data.clinicId),
        ),
      )
      .limit(1);

    if (!row) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Patient not found' } });
    if (row.deletedAt) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Patient not found' } });

    return reply.send({ success: true, data: row });
  });
}
