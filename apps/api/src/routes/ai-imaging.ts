import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { requireClinicFeature } from '../clinic/access.js';
import type { AuthServices, ClinicRole } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import type { AiImagingService } from '../clinic/ai-imaging-service.js';
import { AiImagingError } from '../clinic/ai-imaging-service.js';
import { postgresUuidSchema } from '../validation.js';

const clinic = z.object({ clinicId: postgresUuidSchema });
const patient = clinic.extend({ patientId: postgresUuidSchema });
const analysis = clinic.extend({ analysisId: postgresUuidSchema });
const body = z.object({ fileId: postgresUuidSchema, encounterId: postgresUuidSchema.optional() }).strict();
const roles: readonly ClinicRole[] = ['clinic_owner', 'clinic_admin', 'dentist'];
function actor(request: FastifyRequest, auth: { user: { id: string; email: string } }) { return { id: auth.user.id, email: auth.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }
function error(reply: FastifyReply, caught: unknown) { if (caught instanceof AiImagingError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; }

export async function registerAiImagingRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService; imaging: AiImagingService }) {
  app.post('/v1/clinic/:clinicId/ai-imaging/radiographs', async (request, reply) => { const p = clinic.safeParse(request.params); const b = body.safeParse(request.body); if (!p.success || !b.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Radiograph and optional encounter are required' } }); const auth = await requireClinicFeature(request, reply, options, p.data.clinicId, FeatureKey.AI_IMAGING, [...roles]); if (!auth) return; try { return reply.status(201).send({ success: true, data: await options.imaging.analyzeRadiograph(p.data.clinicId, b.data.fileId, b.data.encounterId, actor(request, auth)) }); } catch (caught) { return error(reply, caught); } });
  app.get('/v1/clinic/:clinicId/ai-imaging/patients/:patientId', async (request, reply) => { const p = patient.safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid patient identifier' } }); if (!await requireClinicFeature(request, reply, options, p.data.clinicId, FeatureKey.AI_IMAGING, [...roles])) return; try { return reply.send({ success: true, data: await options.imaging.list(p.data.clinicId, p.data.patientId) }); } catch (caught) { return error(reply, caught); } });
  app.post('/v1/clinic/:clinicId/ai-imaging/:analysisId/confirm', async (request, reply) => { const p = analysis.safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid analysis identifier' } }); const auth = await requireClinicFeature(request, reply, options, p.data.clinicId, FeatureKey.AI_IMAGING, [...roles]); if (!auth) return; try { return reply.send({ success: true, data: await options.imaging.confirm(p.data.clinicId, p.data.analysisId, actor(request, auth)) }); } catch (caught) { return error(reply, caught); } });
  app.get('/v1/clinic/:clinicId/ai-imaging/patients/:patientId/score', async (request, reply) => { const p = patient.safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid patient identifier' } }); if (!await requireClinicFeature(request, reply, options, p.data.clinicId, FeatureKey.AI_IMAGING, [...roles])) return; try { return reply.send({ success: true, data: await options.imaging.oralHealthScore(p.data.clinicId, p.data.patientId) }); } catch (caught) { return error(reply, caught); } });
}
