import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import type { AuthServices, AuthorizationContext } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import { requireClinicFeature } from '../clinic/access.js';
import {
  ClinicPatientError,
  type ClinicPatientsService,
} from '../clinic/patients-service.js';
import { postgresUuidSchema } from '../validation.js';

const clinicQuery = z.object({ clinicId: postgresUuidSchema });
const listQuery = clinicQuery.extend({
  search: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const patientParams = z.object({ patientId: postgresUuidSchema });
const clinicPatientParams = z.object({
  clinicId: postgresUuidSchema,
  patientId: postgresUuidSchema,
});
const optional = (max: number) => z.string().trim().max(max).optional();
const patientBody = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  middleName: optional(100),
  dateOfBirth: optional(20),
  sex: optional(10),
  civilStatus: optional(20),
  occupation: optional(200),
  nationality: optional(100),
  phone: optional(20),
  email: z.string().trim().email().max(255).optional().or(z.literal('')),
  address: optional(1000),
  city: optional(100),
  province: optional(100),
  emergencyContactName: optional(200),
  emergencyContactPhone: optional(20),
  emergencyContactRelation: optional(100),
  guardianName: optional(200),
  guardianPhone: optional(20),
  guardianRelation: optional(100),
  notes: optional(2000),
}).strict();
const medicalBody = z.object({
  allergies: optional(2000),
  currentMedications: optional(2000),
  majorConditions: optional(2000),
  isPregnant: z.enum(['yes', 'no', 'not_applicable']).optional(),
  physicianName: optional(200),
  physicianPhone: optional(20),
  notes: optional(3000),
}).strict();
const dentalBody = z.object({
  lastDentalVisit: optional(50),
  previousTreatments: optional(2000),
  hasSensitivity: z.enum(['yes', 'no']).optional(),
  hasBleedingGums: z.enum(['yes', 'no']).optional(),
  hasPain: z.enum(['yes', 'no']).optional(),
  oralHabits: optional(2000),
  orthodonticHistory: optional(2000),
  chiefConcerns: optional(2000),
  notes: optional(3000),
}).strict();
const writeRoles = ['clinic_owner', 'clinic_admin', 'receptionist', 'dental_assistant'] as const;
const clinicalRoles = ['clinic_owner', 'clinic_admin', 'dentist', 'dental_assistant'] as const;

function actor(request: FastifyRequest, authorization: AuthorizationContext) {
  return {
    id: authorization.user.id,
    email: authorization.user.email,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

function patientError(reply: FastifyReply, caught: unknown) {
  if (caught instanceof ClinicPatientError) {
    return reply.status(caught.statusCode).send({
      success: false,
      error: { code: caught.code, message: caught.message },
    });
  }
  throw caught;
}

export async function registerClinicPatientRoutes(
  app: FastifyInstance,
  options: {
    auth: AuthServices;
    entitlements: EntitlementService;
    patients: ClinicPatientsService;
  },
) {
  app.get('/v1/clinic/patients', async (request, reply) => {
    const query = listQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid patient filters' },
      });
    }
    const authorization = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.PATIENTS_MANAGE,
    );
    if (!authorization) return;
    return reply.send({
      success: true,
      data: await options.patients.list(query.data.clinicId, query.data),
    });
  });

  app.post('/v1/clinic/patients', async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    const parsed = patientBody.safeParse(request.body);
    if (!query.success || !parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please check the patient details' },
      });
    }
    const authorization = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.PATIENTS_MANAGE,
      [...writeRoles],
    );
    if (!authorization) return;
    try {
      return reply.status(201).send({
        success: true,
        data: await options.patients.create(
          query.data.clinicId,
          parsed.data,
          actor(request, authorization),
        ),
      });
    } catch (caught) {
      return patientError(reply, caught);
    }
  });

  app.get('/v1/clinic/patients/:patientId', async (request, reply) => {
    const parsedParams = patientParams.safeParse(request.params);
    const query = clinicQuery.extend({
      appointmentSort: z.enum(['asc', 'desc']).default('desc'),
    }).safeParse(request.query);
    if (!parsedParams.success || !query.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid patient request' },
      });
    }
    const authorization = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.PATIENTS_MANAGE,
    );
    if (!authorization) return;
    const detail = await options.patients.detail(
      query.data.clinicId,
      parsedParams.data.patientId,
      query.data.appointmentSort,
    );
    if (!detail) {
      return reply.status(404).send({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient not found' },
      });
    }
    return reply.send({ success: true, data: detail });
  });

  // Flat patient response used by the newer path-scoped clinic API.
  app.get('/v1/clinic/:clinicId/patients/:patientId', async (request, reply) => {
    const parsed = clinicPatientParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid patient request' },
      });
    }
    const authorization = await requireClinicFeature(
      request,
      reply,
      options,
      parsed.data.clinicId,
      FeatureKey.PATIENTS_MANAGE,
    );
    if (!authorization) return;
    const detail = await options.patients.detail(
      parsed.data.clinicId,
      parsed.data.patientId,
      'desc',
    );
    if (!detail) {
      return reply.status(404).send({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'Patient not found' },
      });
    }
    return reply.send({ success: true, data: detail.patient });
  });

  app.post('/v1/clinic/patients/:patientId/medical-history', async (request, reply) => {
    const parsedParams = patientParams.safeParse(request.params);
    const query = clinicQuery.safeParse(request.query);
    const parsed = medicalBody.safeParse(request.body);
    if (!parsedParams.success || !query.success || !parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid medical history' },
      });
    }
    const authorization = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.CLINICAL_RECORDS,
      [...clinicalRoles],
    );
    if (!authorization) return;
    try {
      return reply.status(201).send({
        success: true,
        data: await options.patients.addMedicalHistory(
          query.data.clinicId,
          parsedParams.data.patientId,
          parsed.data,
          actor(request, authorization),
        ),
      });
    } catch (caught) {
      return patientError(reply, caught);
    }
  });

  app.post('/v1/clinic/patients/:patientId/dental-history', async (request, reply) => {
    const parsedParams = patientParams.safeParse(request.params);
    const query = clinicQuery.safeParse(request.query);
    const parsed = dentalBody.safeParse(request.body);
    if (!parsedParams.success || !query.success || !parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid dental history' },
      });
    }
    const authorization = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.CLINICAL_RECORDS,
      [...clinicalRoles],
    );
    if (!authorization) return;
    try {
      return reply.status(201).send({
        success: true,
        data: await options.patients.addDentalHistory(
          query.data.clinicId,
          parsedParams.data.patientId,
          parsed.data,
          actor(request, authorization),
        ),
      });
    } catch (caught) {
      return patientError(reply, caught);
    }
  });
}
