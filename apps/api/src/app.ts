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
import type { AdminAuditService } from './admin/audit-service.js';
import type { EntitlementService } from './entitlements/service.js';
import type { PublicDirectoryService } from './public/directory-service.js';
import type { PublicBookingService } from './public/booking-service.js';
import type { ClinicSettingsService } from './clinic/settings-service.js';
import type { ClinicWorkspaceService } from './clinic/workspace-service.js';
import type { ClinicPatientsService } from './clinic/patients-service.js';
import type { ClinicEncountersService } from './clinic/encounters-service.js';
import type { ClinicOdontogramService } from './clinic/odontogram-service.js';
import type { ClinicTreatmentsService } from './clinic/treatments-service.js';
import type { ClinicDashboardService } from './clinic/dashboard-service.js';
import type { ClinicTreatmentPlansService } from './clinic/treatment-plans-service.js';
import type { ClinicServiceCatalogService } from './clinic/service-catalog-service.js';
import type { ClinicInventoryService } from './clinic/inventory-service.js';
import type { NotificationService } from './notifications/service.js';
import type { RecallService } from './clinic/recall-service.js';
import type { ClinicReportsService } from './clinic/reports-service.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerAdminClinicRoutes } from './routes/admin-clinics.js';
import { registerAdminDentistRoutes } from './routes/admin-dentists.js';
import { registerAdminPackageRoutes } from './routes/admin-packages.js';
import { registerAdminSubscriptionRoutes } from './routes/admin-subscriptions.js';
import { registerAdminAuditRoutes } from './routes/admin-audit.js';
import { registerEntitlementRoutes } from './routes/entitlements.js';
import { registerPublicDirectoryRoutes } from './routes/public-directory.js';
import { registerPublicBookingRoutes } from './routes/public-booking.js';
import { registerClinicSettingsRoutes } from './routes/clinic-settings.js';
import { registerClinicWorkspaceRoutes } from './routes/clinic-workspace.js';
import { registerClinicPatientRoutes } from './routes/clinic-patients.js';
import { registerClinicEncounterRoutes } from './routes/clinic-encounters.js';
import { registerClinicOdontogramRoutes } from './routes/clinic-odontogram.js';
import { registerClinicTreatmentRoutes } from './routes/clinic-treatments.js';
import { registerClinicTreatmentPlanRoutes } from './routes/clinic-treatment-plans.js';
import { registerClinicDashboardRoutes } from './routes/clinic-dashboard.js';
import { registerClinicBillingRoutes } from './routes/clinic-billing.js';
import { registerClinicServiceCatalogRoutes } from './routes/clinic-service-catalog.js';
import { registerClinicInventoryRoutes } from './routes/clinic-inventory.js';
import { registerClinicPrescriptionRoutes } from './routes/clinic-prescriptions.js';
import { registerClinicFilesRoutes } from './routes/clinic-files.js';
import { registerClinicAiRoutes } from './routes/clinic-ai.js';
import { registerRemoteConsultRoutes } from './routes/remote-consults.js';
import { registerHmoRoutes } from './routes/hmo.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerClinicRecallRoutes } from './routes/clinic-recalls.js';
import { registerClinicReportsRoutes } from './routes/clinic-reports.js';
import { registerSubscriptionOperationRoutes } from './routes/subscription-operations.js';
import type { SubscriptionOperationsService } from './clinic/subscription-operations-service.js';
import type { ClinicPermissionsService } from './clinic/permissions-service.js';
import { registerClinicPermissionRoutes } from './routes/clinic-permissions.js';
import { registerPatientPortalRoutes } from './routes/patient-portal.js';
import type { PatientPortalService } from './patient/portal-service.js';
import { registerVerificationRoutes } from './routes/verification.js';
import type { VerificationService } from './verification/service.js';
import { registerReviewRoutes } from './routes/reviews.js';
import type { ReviewService } from './reviews/service.js';
import { registerOrganizationRoutes } from './routes/organizations.js';
import type { OrganizationService } from './organizations/service.js';
import { registerClinicAnalyticsRoutes } from './routes/clinic-analytics.js';
import type { ClinicAnalyticsService } from './clinic/analytics-service.js';
import { registerOnlinePaymentRoutes } from './routes/online-payments.js';
import type { PaymentService } from './payments/service.js';
import { registerCustomDomainRoutes } from './routes/custom-domains.js';
import type { CustomDomainService } from './domains/service.js';
import { registerIntegrationRoutes } from './routes/integrations.js';
import type { IntegrationService } from './integrations/service.js';

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
  adminClinicSettings?: AdminClinicSettingsService;
  adminDentists?: AdminDentistListService;
  adminDentistCreation?: AdminDentistCreationService;
  adminDentistDetails?: AdminDentistDetailService;
  adminDentistAffiliations?: AdminDentistAffiliationService;
  adminDentistProfileState?: AdminDentistProfileStateService;
  adminPackages?: AdminPackageService;
  adminSubscriptions?: AdminSubscriptionListService;
  adminAudit?: AdminAuditService;
  entitlements?: EntitlementService;
  publicDirectory?: PublicDirectoryService;
  publicBooking?: PublicBookingService;
  clinicSettings?: ClinicSettingsService;
  clinicWorkspace?: ClinicWorkspaceService;
  clinicPatients?: ClinicPatientsService;
  clinicEncounters?: ClinicEncountersService;
  clinicOdontogram?: ClinicOdontogramService;
  clinicTreatments?: ClinicTreatmentsService;
  clinicDashboard?: ClinicDashboardService;
  clinicTreatmentPlans?: ClinicTreatmentPlansService;
  clinicServiceCatalog?: ClinicServiceCatalogService;
  clinicInventory?: ClinicInventoryService;
  notifications?: NotificationService;
  clinicRecalls?: RecallService;
  clinicReports?: ClinicReportsService;
  subscriptionOperations?: SubscriptionOperationsService;
  clinicPermissions?: ClinicPermissionsService;
  patientPortal?: PatientPortalService;
  verification?: VerificationService;
  reviews?: ReviewService;
  organizations?: OrganizationService;
  clinicAnalytics?: ClinicAnalyticsService;
  payments?: PaymentService;
  customDomains?: CustomDomainService;
  integrations?: IntegrationService;
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
    if (options.adminAudit) {
      await registerAdminAuditRoutes(app, { auth: options.auth, audit: options.adminAudit });
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
    if (options.clinicEncounters && options.entitlements) {
      await registerClinicEncounterRoutes(app, { auth: options.auth, entitlements: options.entitlements, encounters: options.clinicEncounters });
    }
    if (options.clinicOdontogram && options.entitlements) {
      await registerClinicOdontogramRoutes(app, { auth: options.auth, entitlements: options.entitlements, odontogram: options.clinicOdontogram });
    }
    if (options.clinicTreatments && options.entitlements) {
      await registerClinicTreatmentRoutes(app, { auth: options.auth, entitlements: options.entitlements, treatments: options.clinicTreatments, recalls: options.clinicRecalls });
    }
    if (options.clinicTreatmentPlans && options.entitlements) {
      await registerClinicTreatmentPlanRoutes(app, {
        auth: options.auth,
        entitlements: options.entitlements,
        treatmentPlans: options.clinicTreatmentPlans,
      });
    }
    if (options.clinicServiceCatalog && options.entitlements) {
      await registerClinicServiceCatalogRoutes(app, {
        auth: options.auth,
        entitlements: options.entitlements,
        serviceCatalog: options.clinicServiceCatalog,
      });
    }
    if (options.clinicInventory && options.entitlements) {
      await registerClinicInventoryRoutes(app, { auth: options.auth, entitlements: options.entitlements, inventory: options.clinicInventory });
    }
    if (options.clinicRecalls && options.entitlements) {
      await registerClinicRecallRoutes(app, { auth: options.auth, entitlements: options.entitlements, recalls: options.clinicRecalls });
    }
    if (options.clinicReports && options.entitlements) {
      await registerClinicReportsRoutes(app, { auth: options.auth, entitlements: options.entitlements, reports: options.clinicReports });
    }
    if (options.subscriptionOperations && options.entitlements && options.adminClinicSettings) {
      await registerSubscriptionOperationRoutes(app, { auth: options.auth, entitlements: options.entitlements, operations: options.subscriptionOperations, adminSettings: options.adminClinicSettings });
    }
    if (options.clinicPermissions && options.entitlements) {
      await registerClinicPermissionRoutes(app, { auth: options.auth, entitlements: options.entitlements, permissions: options.clinicPermissions });
    }
    if (options.patientPortal) {
      await registerPatientPortalRoutes(app, { portal: options.patientPortal });
    }
    if (options.verification) {
      await registerVerificationRoutes(app, { auth: options.auth, verification: options.verification });
    }
    if (options.reviews) {
      await registerReviewRoutes(app, { auth: options.auth, reviews: options.reviews });
    }
    if (options.organizations) {
      await registerOrganizationRoutes(app, { auth: options.auth, organizations: options.organizations });
    }
    if (options.clinicAnalytics && options.entitlements) {
      await registerClinicAnalyticsRoutes(app, { auth: options.auth, entitlements: options.entitlements, analytics: options.clinicAnalytics });
    }
    if (options.payments && options.entitlements) {
      await registerOnlinePaymentRoutes(app, { auth: options.auth, entitlements: options.entitlements, payments: options.payments });
    }
    if (options.customDomains) {
      await registerCustomDomainRoutes(app, { auth: options.auth, domains: options.customDomains });
    }
    if (options.integrations) {
      await registerIntegrationRoutes(app, { auth: options.auth, integrations: options.integrations });
    }
    if (options.clinicDashboard && options.entitlements) {
      await registerClinicDashboardRoutes(app, { auth: options.auth, entitlements: options.entitlements, dashboard: options.clinicDashboard });
    }
    if (options.clinicBilling && options.clinicServiceList && options.entitlements) {
      await registerClinicBillingRoutes(app, {
        auth: options.auth,
        entitlements: options.entitlements,
        billingService: options.clinicBilling,
        serviceListService: options.clinicServiceList,
      });
    }
    if (options.clinicPrescription && options.entitlements) {
      await registerClinicPrescriptionRoutes(app, {
        auth: options.auth,
        entitlements: options.entitlements,
        prescriptionService: options.clinicPrescription,
      });
    }
    if (options.clinicFiles && options.entitlements) {
      await registerClinicFilesRoutes(app, {
        auth: options.auth,
        entitlements: options.entitlements,
        filesService: options.clinicFiles,
      });
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
