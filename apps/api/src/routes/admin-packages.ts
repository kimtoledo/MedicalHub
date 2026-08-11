import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { AdminPackageError, type AdminPackageService } from '../admin/packages-service.js';
import { isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';

const featureValues = Object.values(FeatureKey) as [FeatureKey, ...FeatureKey[]];
const savePackageSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).optional().transform((value) => value || null),
  priceDisplay: z.string().trim().min(1).max(50),
  isActive: z.boolean(),
  featureKeys: z.array(z.enum(featureValues)).max(featureValues.length),
}).strict();
const paramsSchema = z.object({ packageId: z.string().uuid() });

export async function registerAdminPackageRoutes(app: FastifyInstance, options: { auth: AuthServices; packages: AdminPackageService }) {
  async function authorize(request: FastifyRequest, reply: FastifyReply) {
    const context = await resolveRequestAuthorization(request, options.auth);
    if (!context) { reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } }); return null; }
    if (!isSuperAdmin(context)) { reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Super Admin access is required' } }); return null; }
    return context;
  }
  app.get('/v1/admin/packages', async (request, reply) => {
    if (!await authorize(request, reply)) return;
    return reply.send({
      success: true,
      data: {
        items: await options.packages.list(),
        featureCatalog: Object.values(FeatureKey),
      },
    });
  });
  app.post('/v1/admin/packages', async (request, reply) => {
    const auth = await authorize(request, reply); if (!auth) return;
    const body = savePackageSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid package details' } });
    try { return reply.status(201).send({ success: true, data: await options.packages.create(body.data, { id: auth.user.id, email: auth.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] }) }); }
    catch (error) { if (!(error instanceof AdminPackageError)) throw error; return reply.status(error.code === 'PACKAGE_NOT_FOUND' ? 404 : 409).send({ success: false, error: { code: error.code, message: error.message } }); }
  });
  app.put('/v1/admin/packages/:packageId', async (request, reply) => {
    const auth = await authorize(request, reply); if (!auth) return;
    const params = paramsSchema.safeParse(request.params); const body = savePackageSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid package details' } });
    try { return reply.send({ success: true, data: await options.packages.update(params.data.packageId, body.data, { id: auth.user.id, email: auth.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] }) }); }
    catch (error) { if (!(error instanceof AdminPackageError)) throw error; return reply.status(error.code === 'PACKAGE_NOT_FOUND' ? 404 : 409).send({ success: false, error: { code: error.code, message: error.message } }); }
  });
}
