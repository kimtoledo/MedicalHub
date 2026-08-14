import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices } from '../auth/types.js';
import { requireClinicFeature } from '../clinic/access.js';
import type { EntitlementService } from '../entitlements/service.js';
import type { OrganizationService } from '../organizations/service.js';
import { OrganizationError } from '../organizations/service.js';
import { postgresUuidSchema } from '../validation.js';

const adminRoles = ['clinic_owner', 'clinic_admin'] as const;

const create = z.object({ name: z.string().trim().min(2).max(200), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), clinicId: postgresUuidSchema }).strict();
const org = z.object({ organizationId: postgresUuidSchema });
const attach = z.object({ clinicId: postgresUuidSchema }).strict();
const member = z.object({ email: z.string().trim().toLowerCase().email().max(255), role: z.enum(['owner', 'admin', 'regional_manager', 'viewer']), branchIds: z.array(postgresUuidSchema).max(100).default([]) }).strict();
const catalogItemBody = z.object({ name: z.string().trim().min(2).max(200), category: z.string().trim().min(1).max(100), description: z.string().trim().max(2000).optional(), durationMinutes: z.number().int().min(5).max(480), basePricePhp: z.string().regex(/^\d+(?:\.\d{1,2})?$/).nullable().optional(), isActive: z.boolean().optional() }).strict();
const catalogItemUpdate = catalogItemBody.partial();
const catalogItemParams = org.extend({ itemId: postgresUuidSchema });
const adoptBody = z.object({ clinicId: postgresUuidSchema, itemId: postgresUuidSchema }).strict();
const grantEntitlementBody = z.object({ featureKey: z.string().trim().min(2).max(100), isEnabled: z.boolean(), expiresAt: z.string().datetime().optional() }).strict();
const entitlementFeatureParams = org.extend({ featureKey: z.string().trim().min(2).max(100) });
const actor = (request: FastifyRequest, auth: { user: { id: string; email: string } }) => ({ id: auth.user.id, email: auth.user.email, ipAddress: request.ip, userAgent: request.headers['user-agent'] });
const sendError = (reply: any, caught: unknown) => { if (caught instanceof OrganizationError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; };

export async function registerOrganizationRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService; db?: import('@dentra/db').DB; organizations: OrganizationService }) {
  app.post('/v1/organizations', async (request, reply) => {
    const body = create.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid organization' } });
    const auth = await requireClinicFeature(request, reply, options, body.data.clinicId, FeatureKey.ORGANIZATIONS_MANAGE, [...adminRoles]);
    if (!auth) return;
    try { return reply.status(201).send({ success: true, data: await options.organizations.create(body.data, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.get('/v1/organizations', async (request, reply) => {
    const auth = await resolveRequestAuthorization(request, options.auth);
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    return reply.send({ success: true, data: await options.organizations.listMine(auth.user.id) });
  });
  app.get('/v1/organizations/eligible-clinics', async (request, reply) => {
    const auth = await resolveRequestAuthorization(request, options.auth);
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    return reply.send({ success: true, data: await options.organizations.eligibleClinics(auth.user.id) });
  });
  app.get('/v1/organizations/:organizationId/workspace', async (request, reply) => {
    const params = org.safeParse(request.params); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid organization' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.send({ success: true, data: await options.organizations.workspace(params.data.organizationId, auth.user.id) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.post('/v1/organizations/:organizationId/clinics', async (request, reply) => {
    const params = org.safeParse(request.params); const body = attach.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid organization clinic link' } });
    const auth = await requireClinicFeature(request, reply, options, body.data.clinicId, FeatureKey.ORGANIZATIONS_MANAGE, [...adminRoles]);
    if (!auth) return;
    try { return reply.status(201).send({ success: true, data: await options.organizations.attachClinic(params.data.organizationId, body.data.clinicId, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.get('/v1/organizations/:organizationId/report', async (request, reply) => {
    const params = org.safeParse(request.params); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid organization request' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.send({ success: true, data: await options.organizations.report(params.data.organizationId, auth.user.id) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.post('/v1/organizations/:organizationId/members', async (request, reply) => {
    const params = org.safeParse(request.params); const body = member.safeParse(request.body); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: body.success ? 'Invalid organization' : body.error.issues[0]?.message ?? 'Invalid member' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.send({ success: true, data: await options.organizations.upsertMember(params.data.organizationId, body.data, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.get('/v1/organizations/:organizationId/service-catalog', async (request, reply) => {
    const params = org.safeParse(request.params); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid organization' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.send({ success: true, data: await options.organizations.listCatalog(params.data.organizationId, auth.user.id) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.post('/v1/organizations/:organizationId/service-catalog', async (request, reply) => {
    const params = org.safeParse(request.params); const body = catalogItemBody.safeParse(request.body); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid catalog item' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.status(201).send({ success: true, data: await options.organizations.createCatalogItem(params.data.organizationId, body.data, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.patch('/v1/organizations/:organizationId/service-catalog/:itemId', async (request, reply) => {
    const params = catalogItemParams.safeParse(request.params); const body = catalogItemUpdate.safeParse(request.body); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid catalog item change' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.send({ success: true, data: await options.organizations.updateCatalogItem(params.data.organizationId, params.data.itemId, body.data, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.post('/v1/organizations/:organizationId/service-catalog/adopt', async (request, reply) => {
    const params = org.safeParse(request.params); const body = adoptBody.safeParse(request.body); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid catalog adoption request' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.status(201).send({ success: true, data: await options.organizations.adoptCatalogItem(params.data.organizationId, body.data.clinicId, body.data.itemId, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.get('/v1/organizations/:organizationId/entitlements', async (request, reply) => {
    const params = org.safeParse(request.params); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid organization' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.send({ success: true, data: await options.organizations.listEntitlements(params.data.organizationId, auth.user.id) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.post('/v1/organizations/:organizationId/entitlements', async (request, reply) => {
    const params = org.safeParse(request.params); const body = grantEntitlementBody.safeParse(request.body); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success || !body.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid entitlement grant' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.status(201).send({ success: true, data: await options.organizations.grantEntitlement(params.data.organizationId, { featureKey: body.data.featureKey, isEnabled: body.data.isEnabled, expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null }, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
  app.delete('/v1/organizations/:organizationId/entitlements/:featureKey', async (request, reply) => {
    const params = entitlementFeatureParams.safeParse(request.params); const auth = await resolveRequestAuthorization(request, options.auth);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid entitlement' } });
    if (!auth) return reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign-in required' } });
    try { return reply.send({ success: true, data: await options.organizations.revokeEntitlement(params.data.organizationId, params.data.featureKey, actor(request, auth)) }); } catch (caught) { return sendError(reply, caught); }
  });
}
