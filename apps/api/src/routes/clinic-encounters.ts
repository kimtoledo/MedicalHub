import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import type { AuthServices, AuthorizationContext } from '../auth/types.js';
import { getClinicAccess } from '../auth/authorization.js';
import type { EntitlementService } from '../entitlements/service.js';
import { requireClinicFeature } from '../clinic/access.js';
import {
  ClinicEncounterError,
  type ClinicEncountersService,
} from '../clinic/encounters-service.js';
import { isActiveClinicDentist } from '../clinic/dentist-directory.js';
import { postgresUuidSchema } from '../validation.js';

const clinicQuery = z.object({ clinicId: postgresUuidSchema });
const clinicParams = z.object({ clinicId: postgresUuidSchema });
const listQuery = clinicQuery.extend({
  patientId: postgresUuidSchema.optional(),
  dentistId: postgresUuidSchema.optional(),
});
const encounterParams = z.object({ encounterId: postgresUuidSchema });
const clinicEncounterParams = clinicParams.extend({ encounterId: postgresUuidSchema });
const optional = (max: number) => z.string().trim().max(max).optional();
const body = z.object({
  branchId: postgresUuidSchema,
  patientId: postgresUuidSchema,
  appointmentId: postgresUuidSchema.optional(),
  /** Required when the caller isn't a dentist themselves — the dentist this encounter is attributed to. */
  dentistId: postgresUuidSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  chiefComplaint: optional(5000),
  examination: optional(10000),
  assessment: optional(10000),
  procedures: optional(10000),
  recommendations: optional(10000),
  notes: optional(10000),
  status: z.enum(['draft', 'final']).default('draft'),
}).strict();
const patchBody = body.omit({ patientId: true, appointmentId: true, dentistId: true }).partial().strict();
const clinicalRoles = ['clinic_owner', 'clinic_admin', 'dentist', 'dental_assistant'] as const;
const authoringRoles = ['dentist', 'clinic_owner', 'clinic_admin'] as const;
const adminRoles = new Set(['clinic_owner', 'clinic_admin']);

function dentistId(auth: AuthorizationContext, clinicId: string) {
  return getClinicAccess(auth, clinicId)
    .find((item) => item.role === 'dentist' && item.dentistId)?.dentistId ?? null;
}

function isClinicAdmin(auth: AuthorizationContext, clinicId: string) {
  return getClinicAccess(auth, clinicId).some((item) => adminRoles.has(item.role));
}

function actor(request: FastifyRequest, auth: AuthorizationContext) {
  return {
    id: auth.user.id,
    email: auth.user.email,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

function encounterError(reply: FastifyReply, caught: unknown) {
  if (caught instanceof ClinicEncounterError) {
    return reply.status(caught.statusCode).send({
      success: false,
      error: { code: caught.code, message: caught.message },
    });
  }
  throw caught;
}

export async function registerClinicEncounterRoutes(
  app: FastifyInstance,
  options: {
    auth: AuthServices;
    entitlements: EntitlementService;
    db?: import('@dentra/db').DB;
    encounters: ClinicEncountersService;
  },
) {
  app.get('/v1/clinic/encounters', async (request, reply) => {
    const query = listQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid encounter filters' },
      });
    }
    const auth = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.ENCOUNTERS,
      [...clinicalRoles],
    );
    if (!auth) return;
    return reply.send({
      success: true,
      data: await options.encounters.list(query.data.clinicId, query.data),
    });
  });

  app.get('/v1/clinic/encounters/:encounterId', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const parsed = encounterParams.safeParse(request.params);
    if (!query.success || !parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid encounter request' },
      });
    }
    const auth = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.ENCOUNTERS,
      [...clinicalRoles],
    );
    if (!auth) return;
    const row = await options.encounters.get(query.data.clinicId, parsed.data.encounterId);
    if (!row) {
      return reply.status(404).send({
        success: false,
        error: { code: 'ENCOUNTER_NOT_FOUND', message: 'Encounter not found' },
      });
    }
    return reply.send({ success: true, data: row });
  });

  // Path-scoped aliases are used by the newer clinic pages. They share the
  // same entitlement and tenant checks as the established query-scoped API.
  app.get('/v1/clinic/:clinicId/encounters', async (request, reply) => {
    const parsed = clinicParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic ID' },
      });
    }
    const auth = await requireClinicFeature(
      request,
      reply,
      options,
      parsed.data.clinicId,
      FeatureKey.ENCOUNTERS,
      [...clinicalRoles],
    );
    if (!auth) return;
    return reply.send({
      success: true,
      data: await options.encounters.list(parsed.data.clinicId, {}),
    });
  });

  app.get('/v1/clinic/:clinicId/encounters/:encounterId', async (request, reply) => {
    const parsed = clinicEncounterParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid encounter request' },
      });
    }
    const auth = await requireClinicFeature(
      request,
      reply,
      options,
      parsed.data.clinicId,
      FeatureKey.ENCOUNTERS,
      [...clinicalRoles],
    );
    if (!auth) return;
    const row = await options.encounters.get(
      parsed.data.clinicId,
      parsed.data.encounterId,
    );
    if (!row) {
      return reply.status(404).send({
        success: false,
        error: { code: 'ENCOUNTER_NOT_FOUND', message: 'Encounter not found' },
      });
    }
    return reply.send({ success: true, data: row });
  });

  app.post('/v1/clinic/encounters', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const parsed = body.safeParse(request.body);
    if (!query.success || !parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please check the encounter details' },
      });
    }
    const auth = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.ENCOUNTERS,
      [...authoringRoles],
    );
    if (!auth) return;
    const { dentistId: attributedDentistId, ...encounterInput } = parsed.data;
    let dentist = dentistId(auth, query.data.clinicId);
    if (!dentist) {
      if (!isClinicAdmin(auth, query.data.clinicId) || !attributedDentistId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'DENTIST_PROFILE_REQUIRED',
            message: 'A linked dentist profile, or an attributed dentistId, is required',
          },
        });
      }
      if (!options.db || !(await isActiveClinicDentist(options.db, query.data.clinicId, attributedDentistId))) {
        return reply.status(400).send({
          success: false,
          error: { code: 'DENTIST_NOT_ASSIGNED', message: 'The selected dentist is not active in this clinic' },
        });
      }
      dentist = attributedDentistId;
    }
    try {
      return reply.status(201).send({
        success: true,
        data: await options.encounters.create(
          query.data.clinicId,
          dentist,
          encounterInput,
          actor(request, auth),
        ),
      });
    } catch (caught) {
      return encounterError(reply, caught);
    }
  });

  app.patch('/v1/clinic/encounters/:encounterId', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const parsedParams = encounterParams.safeParse(request.params);
    const parsedBody = patchBody.safeParse(request.body);
    if (
      !query.success
      || !parsedParams.success
      || !parsedBody.success
      || !Object.keys(parsedBody.data).length
    ) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please check the encounter changes' },
      });
    }
    const auth = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.ENCOUNTERS,
      [...authoringRoles],
    );
    if (!auth) return;
    const dentist = dentistId(auth, query.data.clinicId);
    if (!dentist && !isClinicAdmin(auth, query.data.clinicId)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'DENTIST_PROFILE_REQUIRED',
          message: 'A linked dentist profile is required',
        },
      });
    }
    try {
      return reply.send({
        success: true,
        data: await options.encounters.update(
          query.data.clinicId,
          parsedParams.data.encounterId,
          dentist,
          parsedBody.data,
          actor(request, auth),
        ),
      });
    } catch (caught) {
      return encounterError(reply, caught);
    }
  });
}
