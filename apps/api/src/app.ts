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
import type { AdminClinicSettingsService } from './admin/clinic-settings-service.js';
import type {
  AdminDentistCreationService,
  AdminDentistAffiliationService,
  AdminDentistDetailService,
  AdminDentistListService,
  AdminDentistProfileStateService,
} from './admin/dentists-service.js';
import type { AdminPackageService } from './admin/packages-service.js';
import type { AdminSubscriptionListService } from './admin/subscriptions-service.js';
import type { EntitlementService } from './entitlements/service.js';
import type { PublicDirectoryService } from './public/directory-service.js';
import type { PublicBookingService } from './public/booking-service.js';
import type { ClinicSettingsService } from './clinic/settings-service.js';
import type { ClinicWorkspaceService } from './clinic/workspace-service.js';
import type { ClinicPatientsService } from './clinic/patients-service.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerAdminClinicRoutes } from './routes/admin-clinics.js';
import { registerAdminDentistRoutes } from './routes/admin-dentists.js';
import { registerAdminPackageRoutes } from './routes/admin-packages.js';
import { registerAdminSubscriptionRoutes } from './routes/admin-subscriptions.js';
import { registerEntitlementRoutes } from './routes/entitlements.js';
import { registerPublicDirectoryRoutes } from './routes/public-directory.js';
import { registerPublicBookingRoutes } from './routes/public-booking.js';
import { registerClinicSettingsRoutes } from './routes/clinic-settings.js';
import { registerClinicWorkspaceRoutes } from './routes/clinic-workspace.js';
import { registerClinicPatientRoutes } from './routes/clinic-patients.js';
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
  adminClinicSettings?: AdminClinicSettingsService;
  adminDentists?: AdminDentistListService;
  adminDentistCreation?: AdminDentistCreationService;
  adminDentistDetails?: AdminDentistDetailService;
  adminDentistAffiliations?: AdminDentistAffiliationService;
  adminDentistProfileState?: AdminDentistProfileStateService;
  adminPackages?: AdminPackageService;
  adminSubscriptions?: AdminSubscriptionListService;
  entitlements?: EntitlementService;
  publicDirectory?: PublicDirectoryService;
  publicBooking?: PublicBookingService;
  clinicSettings?: ClinicSettingsService;
  clinicWorkspace?: ClinicWorkspaceService;
  clinicPatients?: ClinicPatientsService;
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
  if (options.publicDirectory) {
    await registerPublicDirectoryRoutes(app, { directory: options.publicDirectory });
  }
  if (options.publicBooking) {
    await registerPublicBookingRoutes(app, { booking: options.publicBooking });
  }
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
        settings: options.adminClinicSettings,
      });
    }
    if (options.adminDentists) {
      await registerAdminDentistRoutes(app, {
        auth: options.auth,
        dentists: options.adminDentists,
        creation: options.adminDentistCreation,
        details: options.adminDentistDetails,
        affiliations: options.adminDentistAffiliations,
        profileState: options.adminDentistProfileState,
      });
    }
    if (options.adminPackages) {
      await registerAdminPackageRoutes(app, {
        auth: options.auth,
        packages: options.adminPackages,
      });
    }
    if (options.adminSubscriptions) {
      await registerAdminSubscriptionRoutes(app, { auth: options.auth, subscriptions: options.adminSubscriptions });
    }
    if (options.entitlements) {
      await registerEntitlementRoutes(app, { auth: options.auth, entitlements: options.entitlements });
    }
    if (options.clinicSettings && options.adminClinicSettings) {
      await registerClinicSettingsRoutes(app, {
        auth: options.auth,
        settings: options.clinicSettings,
        publication: options.adminClinicSettings,
      });
    }
    if (options.clinicWorkspace) {
      await registerClinicWorkspaceRoutes(app, { auth: options.auth, workspace: options.clinicWorkspace });
    }
    if (options.clinicPatients && options.entitlements) {
      await registerClinicPatientRoutes(app, { auth: options.auth, entitlements: options.entitlements, patients: options.clinicPatients });
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
