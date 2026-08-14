import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import type { DB } from '@dentra/db';
import { requireClinicFeature } from '../clinic/access.js';
import { PatientReferralError, type PatientReferralService } from '../clinic/patient-referrals-service.js';
import type { AuthServices, AuthorizationContext } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import { postgresUuidSchema } from '../validation.js';

const clinicQuery = z.object({ clinicId: postgresUuidSchema });
const referralParams = z.object({ referralId: postgresUuidSchema });
const createBody = z.object({ sourcePatientId: postgresUuidSchema, targetClinicId: postgresUuidSchema, reason: z.string().trim().min(10).max(2000), consented: z.boolean() }).strict();

const createRoles = ['clinic_owner', 'clinic_admin', 'dentist'] as const;
const respondRoles = ['clinic_owner', 'clinic_admin'] as const;

function actor(request: FastifyRequest, authorization: AuthorizationContext) {
  return { id: authorization.user.id, email: authorization.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] };
}

function referralError(reply: FastifyReply, caught: unknown) {
  if (caught instanceof PatientReferralError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } });
  throw caught;
}

export async function registerPatientReferralRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService; referrals: PatientReferralService; db?: DB }) {
  app.get('/v1/clinic/patient-referrals', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic identifier' } });
    const authorization = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.PATIENT_REFERRALS);
    if (!authorization) return;
    return reply.send({ success: true, data: await options.referrals.listForClinic(query.data.clinicId) });
  });

  app.post('/v1/clinic/patient-referrals', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const body = createBody.safeParse(request.body);
    if (!query.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.success ? 'Invalid clinic identifier' : body.error.issues[0]?.message ?? 'Invalid referral' } });
    const authorization = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.PATIENT_REFERRALS, [...createRoles]);
    if (!authorization) return;
    try {
      const created = await options.referrals.create(query.data.clinicId, body.data.sourcePatientId, body.data.targetClinicId, { reason: body.data.reason, consented: body.data.consented }, actor(request, authorization));
      return reply.status(201).send({ success: true, data: created });
    } catch (caught) { return referralError(reply, caught); }
  });

  app.post('/v1/clinic/patient-referrals/:referralId/accept', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const params = referralParams.safeParse(request.params);
    if (!query.success || !params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid referral request' } });
    const authorization = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.PATIENT_REFERRALS, [...respondRoles]);
    if (!authorization) return;
    try {
      const result = await options.referrals.accept(params.data.referralId, query.data.clinicId, actor(request, authorization));
      return reply.send({ success: true, data: result });
    } catch (caught) { return referralError(reply, caught); }
  });

  app.post('/v1/clinic/patient-referrals/:referralId/decline', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const params = referralParams.safeParse(request.params);
    if (!query.success || !params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid referral request' } });
    const authorization = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.PATIENT_REFERRALS, [...respondRoles]);
    if (!authorization) return;
    try {
      const result = await options.referrals.decline(params.data.referralId, query.data.clinicId, actor(request, authorization));
      return reply.send({ success: true, data: result });
    } catch (caught) { return referralError(reply, caught); }
  });
}
