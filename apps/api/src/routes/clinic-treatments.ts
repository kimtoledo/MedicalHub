import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import type { AuthServices, AuthorizationContext } from '../auth/types.js';
import { getClinicAccess } from '../auth/authorization.js';
import type { EntitlementService } from '../entitlements/service.js';
import { requireClinicFeature } from '../clinic/access.js';
import { ClinicTreatmentError, type ClinicTreatmentsService } from '../clinic/treatments-service.js';
import { postgresUuidSchema } from '../validation.js';

const clinicQuery = z.object({ clinicId: postgresUuidSchema });
const listQuery = clinicQuery.extend({ search: z.string().trim().max(100).default(''), dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), branchId: postgresUuidSchema.optional(), dentistId: postgresUuidSchema.optional(), serviceId: postgresUuidSchema.optional(), workflowMode: z.enum(['quick', 'standard']).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) });
const encounterParams = z.object({ encounterId: postgresUuidSchema });
const patientParams = z.object({ patientId: postgresUuidSchema });
const body = z.object({ serviceId: postgresUuidSchema, toothRef: z.string().trim().max(50).optional(), notes: z.string().trim().max(5000).optional(), performedAt: z.string().datetime({ offset: true }).optional() }).strict();
const roles = ['clinic_owner', 'clinic_admin', 'dentist', 'dental_assistant'] as const;
const authoringRoles = ['dentist', 'clinic_owner', 'clinic_admin'] as const;
const adminRoles = new Set(['clinic_owner', 'clinic_admin']);
function dentistId(auth: AuthorizationContext, clinicId: string) { return getClinicAccess(auth, clinicId).find((item) => item.role === 'dentist' && item.dentistId)?.dentistId ?? null; }
function isClinicAdmin(auth: AuthorizationContext, clinicId: string) { return getClinicAccess(auth, clinicId).some((item) => adminRoles.has(item.role)); }
function actor(request: FastifyRequest, auth: AuthorizationContext) { return { id: auth.user.id, email: auth.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }
function error(reply: FastifyReply, caught: unknown) { if (caught instanceof ClinicTreatmentError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; }
function branchScope(auth: AuthorizationContext, clinicId: string, requested?: string) { const memberships = getClinicAccess(auth, clinicId); if (memberships.some((item) => item.branchId === null)) return requested ? [requested] : undefined; const allowed = Array.from(new Set(memberships.flatMap((item) => item.branchId ? [item.branchId] : []))); if (requested && !allowed.includes(requested)) throw new ClinicTreatmentError('BRANCH_FORBIDDEN', 'Branch access is required', 403); return requested ? [requested] : allowed; }

export async function registerClinicTreatmentRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService; db?: import('@dentra/db').DB; treatments: ClinicTreatmentsService; recalls?: import('../clinic/recall-service.js').RecallService }) {
  app.get('/v1/clinic/treatments', async (request, reply) => {
    const query = listQuery.safeParse(request.query);
    if (!query.success || (query.data.dateFrom && query.data.dateTo && query.data.dateFrom > query.data.dateTo)) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid service-record filters' } });
    const auth = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.TREATMENT_RECORDS, [...roles]);
    if (!auth) return;
    try { const { clinicId, branchId, dentistId: requestedDentistId, ...filters } = query.data; const memberships = getClinicAccess(auth, clinicId); const ownDentistId = memberships.every((item) => item.role === 'dentist') ? dentistId(auth, clinicId) ?? undefined : undefined; return reply.send({ success: true, data: await options.treatments.list(clinicId, { ...filters, branchIds: branchScope(auth, clinicId, branchId), dentistId: ownDentistId ?? requestedDentistId }) }); } catch (caught) { return error(reply, caught); }
  });
  app.get('/v1/clinic/services', async (request, reply) => { const query = clinicQuery.safeParse(request.query); if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic request' } }); const auth = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.TREATMENT_RECORDS, [...roles]); if (!auth) return; return reply.send({ success: true, data: await options.treatments.serviceOptions(query.data.clinicId) }); });
  app.get('/v1/clinic/patients/:patientId/treatments', async (request, reply) => { const query = clinicQuery.safeParse(request.query); const params = patientParams.safeParse(request.params); if (!query.success || !params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid treatment history request' } }); const auth = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.TREATMENT_RECORDS, [...roles]); if (!auth) return; const rows = await options.treatments.listForPatient(query.data.clinicId, params.data.patientId); if (!rows) return reply.status(404).send({ success: false, error: { code: 'PATIENT_NOT_FOUND', message: 'Patient not found' } }); return reply.send({ success: true, data: rows }); });
  app.post('/v1/clinic/encounters/:encounterId/treatments', async (request, reply) => { const query = clinicQuery.safeParse(request.query); const params = encounterParams.safeParse(request.params); const parsed = body.safeParse(request.body); if (!query.success || !params.success || !parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please check the treatment record' } }); const auth = await requireClinicFeature(request, reply, options, query.data.clinicId, FeatureKey.TREATMENT_RECORDS, [...authoringRoles]); if (!auth) return; const dentist = dentistId(auth, query.data.clinicId); if (!dentist && !isClinicAdmin(auth, query.data.clinicId)) return reply.status(403).send({ success: false, error: { code: 'DENTIST_PROFILE_REQUIRED', message: 'A linked dentist profile is required' } }); try { const created = await options.treatments.create(query.data.clinicId, params.data.encounterId, dentist, parsed.data, actor(request, auth)); if (options.recalls) await options.recalls.createFromTreatment(query.data.clinicId, created.id, actor(request, auth)); return reply.status(201).send({ success: true, data: created }); } catch (caught) { return error(reply, caught); } });
}
