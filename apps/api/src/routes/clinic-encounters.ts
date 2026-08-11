/**
 * Minimal encounter routes — detail read + list.
 * Expanded in a later task when the full encounter management UI is built.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { hasClinicAccess, getClinicAccess, isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthorizationContext, AuthServices } from '../auth/types.js';
import type { DB } from '@dentra/db';
import { encounters, patients, dentists, branches } from '@dentra/db/schema';

const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const clinicParamsSchema = z.object({ clinicId: uuidSchema });
const encounterParamsSchema = z.object({ clinicId: uuidSchema, encounterId: uuidSchema });

function checkClinicAuth(authorization: AuthorizationContext, clinicId: string): boolean {
  if (isSuperAdmin(authorization)) return true;
  return hasClinicAccess(authorization, clinicId);
}

function getCallerBranchIds(authorization: AuthorizationContext, clinicId: string): string[] | null {
  if (isSuperAdmin(authorization)) return null;
  const memberships = getClinicAccess(authorization, clinicId);
  if (memberships.some((m) => m.branchId === null)) return null;
  const ids = memberships.map((m) => m.branchId).filter((id): id is string => id !== null);
  return ids.length > 0 ? ids : null;
}

export type ClinicEncounterRoutesOptions = {
  auth: AuthServices;
  db: DB;
};

export async function registerClinicEncounterRoutes(
  app: FastifyInstance,
  options: ClinicEncounterRoutesOptions,
): Promise<void> {
  const { auth, db } = options;

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/encounters  — list encounters (recent 50)
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/encounters', async (request, reply) => {
    const params = clinicParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid clinic ID' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const { clinicId } = params.data;

    const conditions = [eq(encounters.clinicId, clinicId)];
    if (callerBranchIds && callerBranchIds.length > 0) {
      conditions.push(inArray(encounters.branchId, callerBranchIds));
    }

    const rows = await db
      .select({
        id: encounters.id,
        date: encounters.date,
        status: encounters.status,
        chiefComplaint: encounters.chiefComplaint,
        branchId: encounters.branchId,
        patientId: patients.id,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientNumber: patients.patientNumber,
        dentistFirstName: dentists.firstName,
        dentistLastName: dentists.lastName,
      })
      .from(encounters)
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .leftJoin(dentists, eq(encounters.dentistId, dentists.id))
      .where(and(...conditions))
      .orderBy(desc(encounters.date))
      .limit(50);

    return reply.send({ success: true, data: rows });
  });

  // -----------------------------------------------------------------------
  // GET /v1/clinic/:clinicId/encounters/:encounterId  — encounter detail
  // -----------------------------------------------------------------------
  app.get('/v1/clinic/:clinicId/encounters/:encounterId', async (request, reply) => {
    const params = encounterParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid params' } });

    const authorization = await resolveRequestAuthorization(request, auth);
    if (!authorization) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } });
    if (!checkClinicAuth(authorization, params.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic access required' } });

    const callerBranchIds = getCallerBranchIds(authorization, params.data.clinicId);
    const { clinicId, encounterId } = params.data;

    const [row] = await db
      .select({
        id: encounters.id,
        date: encounters.date,
        status: encounters.status,
        chiefComplaint: encounters.chiefComplaint,
        examination: encounters.examination,
        assessment: encounters.assessment,
        procedures: encounters.procedures,
        recommendations: encounters.recommendations,
        notes: encounters.notes,
        branchId: encounters.branchId,
        branchName: branches.name,
        patientId: patients.id,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientNumber: patients.patientNumber,
        dentistId: dentists.id,
        dentistFirstName: dentists.firstName,
        dentistLastName: dentists.lastName,
      })
      .from(encounters)
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .leftJoin(dentists, eq(encounters.dentistId, dentists.id))
      .leftJoin(branches, eq(encounters.branchId, branches.id))
      .where(
        and(
          eq(encounters.id, encounterId),
          eq(encounters.clinicId, clinicId),
        ),
      )
      .limit(1);

    if (!row) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Encounter not found' } });

    if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(row.branchId)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this encounter' } });
    }

    return reply.send({ success: true, data: row });
  });
}
