import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, {
  LogController,
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import type { ApiConfig } from './config.js';
import type { AuthServices } from './auth/types.js';
import type {
  AdminClinicCreationService,
  AdminClinicBranchCreationService,
  AdminClinicDetailService,
  AdminClinicListService,
  AdminClinicStatusService,
} from './admin/clinics-service.js';
import type {
  ClinicBillingService,
  ClinicServiceListService,
} from './clinic/billing-service.js';
import multipart from '@fastify/multipart';
import type { ClinicPrescriptionService } from './clinic/prescription-service.js';
import type { ClinicFilesService } from './clinic/clinical-files-service.js';
import type { AiAssistanceService } from './clinic/ai-service.js';
import type { RemoteConsultsService } from './clinic/remote-consults-service.js';
import type { HmoService } from './clinic/hmo-service.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerAdminClinicRoutes } from './routes/admin-clinics.js';
import { registerClinicBillingRoutes } from './routes/clinic-billing.js';
import { registerClinicPrescriptionRoutes } from './routes/clinic-prescriptions.js';
import { registerClinicFilesRoutes } from './routes/clinic-files.js';
import { registerClinicEncounterRoutes } from './routes/clinic-encounters.js';
import { registerClinicPatientRoutes } from './routes/clinic-patients.js';
import { registerClinicAiRoutes } from './routes/clinic-ai.js';
import { registerRemoteConsultRoutes } from './routes/remote-consults.js';
import { registerHmoRoutes } from './routes/hmo.js';
import { registerHealthRoutes } from './routes/health.js';

export type BuildAppOptions = {
  config: ApiConfig;
  checkDatabase: () => Promise<void>;
  auth?: AuthServices;
  adminClinics?: AdminClinicListService;
  adminClinicCreation?: AdminClinicCreationService;
  adminClinicBranchCreation?: AdminClinicBranchCreationService;
  adminClinicDetails?: AdminClinicDetailService;
  adminClinicStatus?: AdminClinicStatusService;
  clinicBilling?: ClinicBillingService;
  clinicServiceList?: ClinicServiceListService;
  clinicPrescription?: ClinicPrescriptionService;
  clinicFiles?: ClinicFilesService;
  clinicAi?: AiAssistanceService;
  remoteConsults?: RemoteConsultsService;
  hmo?: HmoService;
  db?: import('@dentra/db').DB;
  logger?: FastifyServerOptions['logger'];
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? {
      level: options.config.logLevel,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers.set-cookie',
        ],
        censor: '[REDACTED]',
      },
    },
    logController: new LogController({
      disableRequestLogging: options.config.nodeEnv === 'test',
    }),
  });

  await app.register(helmet);
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  // Multipart uploads — 20 MB limit, 1 file per request
  await app.register(multipart, {
    // files: allow up to 5 for the public remote-consult endpoint;
    // individual routes that expect only one file validate further in-handler.
    limits: { fileSize: 20 * 1024 * 1024, files: 5, fields: 10 },
  });
  await app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin || options.config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed'), false);
    },
  });

  await registerHealthRoutes(app, { checkDatabase: options.checkDatabase });
  if (options.auth) {
    await registerAuthRoutes(app, { auth: options.auth, config: options.config });
    if (options.adminClinics) {
      await registerAdminClinicRoutes(app, {
        auth: options.auth,
        clinics: options.adminClinics,
        creation: options.adminClinicCreation,
        branchCreation: options.adminClinicBranchCreation,
        details: options.adminClinicDetails,
        status: options.adminClinicStatus,
      });
    }
    if (options.clinicBilling && options.clinicServiceList) {
      await registerClinicBillingRoutes(app, {
        auth: options.auth,
        billingService: options.clinicBilling,
        serviceListService: options.clinicServiceList,
      });
    }
    if (options.clinicPrescription) {
      await registerClinicPrescriptionRoutes(app, {
        auth: options.auth,
        prescriptionService: options.clinicPrescription,
      });
    }
    if (options.clinicFiles) {
      await registerClinicFilesRoutes(app, {
        auth: options.auth,
        filesService: options.clinicFiles,
      });
    }
    if (options.db) {
      await registerClinicEncounterRoutes(app, { auth: options.auth, db: options.db });
      await registerClinicPatientRoutes(app, { auth: options.auth, db: options.db });
    }
    if (options.clinicAi && options.db) {
      await registerClinicAiRoutes(app, {
        auth: options.auth,
        aiService: options.clinicAi,
        db: options.db,
      });
    }
    if (options.remoteConsults) {
      await registerRemoteConsultRoutes(app, {
        auth: options.auth,
        rcService: options.remoteConsults,
      });
    }
    if (options.hmo) {
      await registerHmoRoutes(app, { auth: options.auth, hmo: options.hmo });
    }
  }

  app.setNotFoundHandler(async (_request, reply) => reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  }));

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({ err: error }, 'Request failed');

    const hasValidation =
      typeof error === 'object' && error !== null && 'validation' in error;
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : undefined;
    const message = error instanceof Error ? error.message : 'Request failed';

    if (hasValidation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
        },
      });
    }

    return reply.status(statusCode ?? 500).send({
      success: false,
      error: {
        code: statusCode ? 'REQUEST_ERROR' : 'INTERNAL_ERROR',
        message: statusCode ? message : 'Internal server error',
      },
    });
  });

  return app;
}
