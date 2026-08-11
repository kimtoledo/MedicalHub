import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FeatureKey } from '@dentra/shared';
import { getClinicAccess } from '../auth/authorization.js';
import { resolveRequestAuthorization } from '../auth/request.js';
import type { AuthServices, AuthorizationContext, ClinicRole } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';

export async function requireClinicFeature(request: FastifyRequest, reply: FastifyReply, options: { auth: AuthServices; entitlements: EntitlementService }, clinicId: string, featureKey: FeatureKey, allowedRoles?: ClinicRole[]): Promise<AuthorizationContext | null> {
  const authorization = await resolveRequestAuthorization(request, options.auth);
  if (!authorization) { await reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'A valid session is required' } }); return null; }
  const access = getClinicAccess(authorization, clinicId);
  if (!access.length || (allowedRoles && !access.some((item) => allowedRoles.includes(item.role)))) { await reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Clinic role access is required' } }); return null; }
  const resolved = await options.entitlements.resolve(clinicId);
  if (!resolved) { await reply.status(404).send({ success: false, error: { code: 'CLINIC_NOT_FOUND', message: 'Clinic not found' } }); return null; }
  if (!resolved.entitlements.some((item) => item.featureKey === featureKey && item.isEnabled)) { await reply.status(403).send({ success: false, error: { code: 'ENTITLEMENT_REQUIRED', message: `Feature ${featureKey} is not available for this clinic` } }); return null; }
  return authorization;
}
