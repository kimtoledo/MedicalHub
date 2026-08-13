import type { FastifyReply, FastifyRequest } from 'fastify';
import type { DB } from '@dentra/db';
import type { FeatureKey } from '@dentra/shared';
import { getClinicAccess, isSuperAdmin } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import { hasActiveSupportGrant } from '../auth/support-access.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function requireClinicFeature(request: FastifyRequest, reply: FastifyReply, options: { auth: AuthServices; entitlements: EntitlementService; db?: DB }, clinicId: string, featureKey: FeatureKey, allowedRoles?: ClinicRole[]): Promise<AuthorizationContext | null> {
  const authorization = await resolveRequestAuthorization(request, options.auth);
  if (!authorization) { await reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } }); return null; }
  const access = getClinicAccess(authorization, clinicId);
  const localAccessOk = access.length > 0 && (!allowedRoles || access.some((item) => allowedRoles.includes(item.role)));
  if (!localAccessOk) {
    const grantedViaSupport = options.db && (await hasActiveSupportGrant(options.db, authorization, clinicId));
    if (!grantedViaSupport) { await reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic role access is required' } }); return null; }
  }
  const resolved = await options.entitlements.resolve(clinicId);
  if (!resolved) { await reply.status(404).send({ success: false, error: { code: 'CLINIC_NOT_FOUND', message: 'Clinic not found' } }); return null; }
  if (resolved.clinic.maintenanceMode && WRITE_METHODS.has(request.method) && !isSuperAdmin(authorization)) { await reply.status(423).send({ success: false, error: { code: 'CLINIC_MAINTENANCE_MODE', message: 'This clinic is in maintenance mode — changes are temporarily disabled' } }); return null; }
  if (!resolved.entitlements.some((item) => item.featureKey === featureKey && item.isEnabled)) { await reply.status(403).send({ success: false, error: { code: 'ENTITLEMENT_REQUIRED', message: `Feature ${featureKey} is not available for this clinic` } }); return null; }
  return authorization;
}
