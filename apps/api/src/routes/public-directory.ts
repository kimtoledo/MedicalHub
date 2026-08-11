import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PublicDirectoryService } from '../public/directory-service.js';
const base = { search: z.string().trim().max(100).default(''), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(48).default(12) };
const clinicQuery = z.object({ ...base, location: z.string().trim().max(100).default(''), service: z.string().trim().max(100).default('') });
const dentistQuery = z.object({ ...base, specialty: z.string().trim().max(100).default('') });
const clinicParams = z.object({ slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) });
export async function registerPublicDirectoryRoutes(app: FastifyInstance, options: { directory: PublicDirectoryService }) {
  app.get('/v1/public/clinics', async (request, reply) => { const query = clinicQuery.safeParse(request.query); if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic directory filters' } }); return reply.send({ success: true, data: await options.directory.listClinics(query.data) }); });
  app.get('/v1/public/dentists', async (request, reply) => { const query = dentistQuery.safeParse(request.query); if (!query.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid dentist directory filters' } }); return reply.send({ success: true, data: await options.directory.listDentists(query.data) }); });
  app.get('/v1/public/summary', async (_request, reply) => reply.send({ success: true, data: await options.directory.summary() }));
  app.get('/v1/public/clinics/:slug', async (request, reply) => { const params = clinicParams.safeParse(request.params); if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid clinic slug' } }); const clinic = await options.directory.getClinicBySlug(params.data.slug); if (!clinic) return reply.status(404).send({ success: false, error: { code: 'CLINIC_NOT_FOUND', message: 'Published clinic not found' } }); return reply.send({ success: true, data: clinic }); });
  app.get('/v1/public/dentists/:slug', async (request, reply) => { const params = clinicParams.safeParse(request.params); if (!params.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid dentist slug' } }); const dentist = await options.directory.getDentistBySlug(params.data.slug); if (!dentist) return reply.status(404).send({ success: false, error: { code: 'DENTIST_NOT_FOUND', message: 'Published dentist not found' } }); return reply.send({ success: true, data: dentist }); });
}
