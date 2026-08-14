import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import type { AuthServices } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import { requireClinicFeature } from '../clinic/access.js';
import { listClinicDentists } from '../clinic/dentist-directory.js';
import { postgresUuidSchema } from '../validation.js';

const clinicParams = z.object({ clinicId: postgresUuidSchema });
const adminRoles = ['clinic_owner', 'clinic_admin'] as const;

/**
 * Directory of a clinic's active dentists, used to populate "attribute this
 * action to..." pickers when a clinic_owner/clinic_admin performs a
 * clinical action that normally requires a dentist's own identity.
 */
export async function registerClinicDentistsRoutes(
  app: FastifyInstance,
  options: { auth: AuthServices; entitlements: EntitlementService; db: import('@dentra/db').DB },
) {
  app.get('/v1/clinic/:clinicId/dentists', async (request, reply) => {
    const params = clinicParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic id' } });
    const auth = await requireClinicFeature(request, reply, options, params.data.clinicId, FeatureKey.STAFF_MANAGE, [...adminRoles]);
    if (!auth) return;
    return reply.send({ success: true, data: await listClinicDentists(options.db, params.data.clinicId) });
  });
}
