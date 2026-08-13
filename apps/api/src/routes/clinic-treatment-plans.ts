import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { getClinicAccess } from '../auth/authorization.js';
import type { AuthorizationContext, AuthServices } from '../auth/types.js';
import { requireClinicFeature } from '../clinic/access.js';
import {
  ClinicTreatmentPlanError,
  type ClinicTreatmentPlansService,
} from '../clinic/treatment-plans-service.js';
import type { EntitlementService } from '../entitlements/service.js';
import { postgresUuidSchema } from '../validation.js';

const clinicQuery = z.object({ clinicId: postgresUuidSchema });
const patientParams = z.object({ patientId: postgresUuidSchema });
const planParams = z.object({ planId: postgresUuidSchema });
const itemParams = z.object({ planId: postgresUuidSchema, itemId: postgresUuidSchema });
const itemInput = z.object({
  serviceId: postgresUuidSchema,
  toothRef: z.string().trim().max(50).optional(),
  area: z.string().trim().max(100).optional(),
  estimatedFeePhp: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  sequence: z.number().int().min(1).max(1000),
  notes: z.string().trim().max(5000).optional(),
});
const createBody = z.object({
  title: z.string().trim().min(2).max(200),
  notes: z.string().trim().max(5000).optional(),
  items: z.array(itemInput).min(1).max(50),
}).strict();
const planPatchBody = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  notes: z.string().trim().max(5000).optional(),
  status: z.enum(['draft', 'approved', 'archived']).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);
const itemStatusBody = z.object({
  status: z.enum(['proposed', 'accepted', 'scheduled', 'in_progress', 'completed', 'cancelled']),
  treatmentRecordId: postgresUuidSchema.optional(),
}).strict();
const viewRoles = ['clinic_owner', 'clinic_admin', 'dentist', 'dental_assistant'] as const;

function getDentistId(auth: AuthorizationContext, clinicId: string): string | null {
  return getClinicAccess(auth, clinicId).find(
    (item) => item.role === 'dentist' && item.dentistId,
  )?.dentistId ?? null;
}

function actor(request: FastifyRequest, auth: AuthorizationContext) {
  return {
    id: auth.user.id,
    email: auth.user.email,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof ClinicTreatmentPlanError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

export async function registerClinicTreatmentPlanRoutes(
  app: FastifyInstance,
  options: {
    auth: AuthServices;
    entitlements: EntitlementService;
    db?: import('@dentra/db').DB;
    treatmentPlans: ClinicTreatmentPlansService;
  },
) {
  app.get('/v1/clinic/patients/:patientId/treatment-plans', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const params = patientParams.safeParse(request.params);
    if (!query.success || !params.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid treatment plan request' } });
    }
    const auth = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.TREATMENT_PLANS, [...viewRoles]);
    if (!auth) return;
    const plans = await options.treatmentPlans.listForPatient(query.data.clinicId, params.data.patientId);
    if (!plans) return reply.status(404).send({ success: false, error: { code: 'PATIENT_NOT_FOUND', message: 'Patient not found' } });
    return reply.send({ success: true, data: plans });
  });

  app.post('/v1/clinic/patients/:patientId/treatment-plans', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const params = patientParams.safeParse(request.params);
    const body = createBody.safeParse(request.body);
    if (!query.success || !params.success || !body.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please check the treatment plan details' } });
    }
    const auth = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.TREATMENT_PLANS, ['dentist']);
    if (!auth) return;
    const dentistId = getDentistId(auth, query.data.clinicId);
    if (!dentistId) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } });
    try {
      const created = await options.treatmentPlans.create(query.data.clinicId, params.data.patientId, dentistId, body.data, actor(request, auth));
      return reply.status(201).send({ success: true, data: created });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get('/v1/clinic/treatment-plans/:planId', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const params = planParams.safeParse(request.params);
    if (!query.success || !params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid treatment plan request' } });
    const auth = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.TREATMENT_PLANS, [...viewRoles]);
    if (!auth) return;
    const plan = await options.treatmentPlans.get(query.data.clinicId, params.data.planId);
    if (!plan) return reply.status(404).send({ success: false, error: { code: 'PLAN_NOT_FOUND', message: 'Treatment plan not found' } });
    return reply.send({ success: true, data: plan });
  });

  app.patch('/v1/clinic/treatment-plans/:planId', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const params = planParams.safeParse(request.params);
    const body = planPatchBody.safeParse(request.body);
    if (!query.success || !params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please check the treatment plan changes' } });
    const auth = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.TREATMENT_PLANS, ['dentist']);
    if (!auth) return;
    const dentistId = getDentistId(auth, query.data.clinicId);
    if (!dentistId) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } });
    try {
      return reply.send({ success: true, data: await options.treatmentPlans.updatePlan(query.data.clinicId, params.data.planId, dentistId, body.data, actor(request, auth)) });
    } catch (error) { return sendError(reply, error); }
  });

  app.patch('/v1/clinic/treatment-plans/:planId/items/:itemId/status', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const params = itemParams.safeParse(request.params);
    const body = itemStatusBody.safeParse(request.body);
    if (!query.success || !params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please check the plan item status' } });
    const auth = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.TREATMENT_PLANS, ['dentist']);
    if (!auth) return;
    const dentistId = getDentistId(auth, query.data.clinicId);
    if (!dentistId) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } });
    try {
      return reply.send({ success: true, data: await options.treatmentPlans.updateItemStatus(query.data.clinicId, params.data.planId, params.data.itemId, dentistId, body.data, actor(request, auth)) });
    } catch (error) { return sendError(reply, error); }
  });
}
