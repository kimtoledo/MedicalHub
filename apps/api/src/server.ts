import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabaseServices } from './database.js';
import { createAuthServices } from './auth/service.js';
import {
  createAdminClinicAccountUpdateService,
  createAdminClinicCreationService,
  createAdminClinicBranchCreationService,
  createAdminClinicDetailService,
  createAdminClinicListService,
  createAdminClinicStatusService,
} from './admin/clinics-service.js';
import {
  createClinicBillingService,
  createClinicServiceListService,
} from './clinic/billing-service.js';
import { createClinicPrescriptionService } from './clinic/prescription-service.js';
import { createClinicFilesService } from './clinic/clinical-files-service.js';
import { createAiAssistanceService } from './clinic/ai-service.js';
import { createLLMProvider } from './ai/provider.js';
import { createRemoteConsultsService } from './clinic/remote-consults-service.js';
import { createHmoService } from './clinic/hmo-service.js';
import { createAdminClinicSettingsService } from './admin/clinic-settings-service.js';
import {
  createAdminDentistCreationService,
  createAdminDentistAffiliationService,
  createAdminDentistDetailService,
  createAdminDentistListService,
  createAdminDentistProfileStateService,
} from './admin/dentists-service.js';
import { createAdminPackageService } from './admin/packages-service.js';
import { createAdminSubscriptionListService } from './admin/subscriptions-service.js';
import { createAdminAuditService } from './admin/audit-service.js';
import { createAdminDashboardService } from './admin/dashboard-service.js';
import { createPlatformSettingsService } from './admin/platform-settings-service.js';
import { createEntitlementService } from './entitlements/service.js';
import { createPublicDirectoryService } from './public/directory-service.js';
import { createPublicBookingService } from './public/booking-service.js';
import { createClinicSettingsService } from './clinic/settings-service.js';
import { createClinicWorkspaceService } from './clinic/workspace-service.js';
import { createClinicPatientsService } from './clinic/patients-service.js';
import { createPatientReferralService } from './clinic/patient-referrals-service.js';
import { createClinicEncountersService } from './clinic/encounters-service.js';
import { createClinicOdontogramService } from './clinic/odontogram-service.js';
import { createClinicTreatmentsService } from './clinic/treatments-service.js';
import { createClinicDashboardService } from './clinic/dashboard-service.js';
import { createClinicTreatmentPlansService } from './clinic/treatment-plans-service.js';
import { createClinicServiceCatalogService } from './clinic/service-catalog-service.js';
import { createClinicInventoryService } from './clinic/inventory-service.js';
import { createNotificationService } from './notifications/service.js';
import { createNotificationProvidersService } from './notifications/providers-service.js';
import { createRecallService } from './clinic/recall-service.js';
import { createClinicReportsService } from './clinic/reports-service.js';
import { createSubscriptionOperationsService } from './clinic/subscription-operations-service.js';
import { createClinicStaffService } from './clinic/staff-service.js';
import { createPatientPortalService } from './patient/portal-service.js';
import { createVerificationService } from './verification/service.js';
import { createReviewService } from './reviews/service.js';
import { createOrganizationService } from './organizations/service.js';
import { createClinicAnalyticsService } from './clinic/analytics-service.js';
import { createPaymentService } from './payments/service.js';
import { createCustomDomainService } from './domains/service.js';
import { createIntegrationService } from './integrations/service.js';
import { createPlatformOperationsService } from './platform/operations-service.js';
import { createRetentionService } from './platform/retention-service.js';
import { createSecurityAlertService } from './platform/security-alerts-service.js';
import { createMetricsService } from './platform/metrics-service.js';
import { createAiImagingService } from './clinic/ai-imaging-service.js';
import { createKioskService } from './kiosk/service.js';
import { createAccountProfileService } from './profile/service.js';
import { createDentistProfileService } from './profile/dentist-profile-service.js';

const config = loadConfig();
const database = await createDatabaseServices();
await database.check();
const auth = createAuthServices(config, database.db);
const adminClinics = createAdminClinicListService(database.db);
const adminClinicCreation = createAdminClinicCreationService(database.db);
const adminClinicBranchCreation = createAdminClinicBranchCreationService(database.db);
const adminClinicDetails = createAdminClinicDetailService(database.db);
const adminClinicStatus = createAdminClinicStatusService(database.db);
const adminClinicAccountUpdate = createAdminClinicAccountUpdateService(database.db);
const integrations = createIntegrationService(database.db);
const clinicBilling = createClinicBillingService(database.db, integrations);
const clinicServiceList = createClinicServiceListService(database.db);
const clinicPrescription = createClinicPrescriptionService(database.db);
const clinicFiles = createClinicFilesService(database.db);
const llmProvider = createLLMProvider();
const clinicAi = createAiAssistanceService(database.db, llmProvider);
const remoteConsults = createRemoteConsultsService(database.db);
const hmo = createHmoService(database.db);
const adminClinicSettings = createAdminClinicSettingsService(database.db);
const adminDentists = createAdminDentistListService(database.db);
const adminDentistCreation = createAdminDentistCreationService(database.db);
const adminDentistDetails = createAdminDentistDetailService(database.db);
const adminDentistAffiliations = createAdminDentistAffiliationService(database.db);
const adminDentistProfileState = createAdminDentistProfileStateService(database.db);
const adminPackages = createAdminPackageService(database.db);
const adminSubscriptions = createAdminSubscriptionListService(database.db);
const adminAudit = createAdminAuditService(database.db);
const adminDashboard = createAdminDashboardService(database.db);
const adminSettings = createPlatformSettingsService(database.db, config);
const entitlements = createEntitlementService(database.db);
const publicDirectory = createPublicDirectoryService(database.db);
const notificationProviders = createNotificationProvidersService(database.db);
const notifications = createNotificationService(database.db, notificationProviders);
const clinicRecalls = createRecallService(database.db, notifications);
const clinicReports = createClinicReportsService(database.db);
const subscriptionOperations = createSubscriptionOperationsService(database.db);
const clinicStaff = createClinicStaffService(database.db);
const patientPortal = createPatientPortalService(database.db);
const verification = createVerificationService(database.db);
const reviews = createReviewService(database.db);
const organizations = createOrganizationService(database.db);
const clinicAnalytics = createClinicAnalyticsService(database.db);
const payments = createPaymentService(database.db, undefined, integrations);
const customDomains = createCustomDomainService(database.db);
const platformOperations = createPlatformOperationsService(database.db);
const retention = createRetentionService(database.db);
const securityAlerts = createSecurityAlertService(database.db);
const metrics = createMetricsService();
const aiImaging = createAiImagingService(database.db);
const kiosk = createKioskService(database.db, entitlements, integrations);
const profiles = createAccountProfileService(database.db);
const dentistProfiles = createDentistProfileService(database.db);
const publicBooking = createPublicBookingService(database.db, notifications, integrations);
const clinicSettings = createClinicSettingsService(database.db);
const clinicWorkspace = createClinicWorkspaceService(database.db);
const clinicPatients = createClinicPatientsService(database.db);
const patientReferrals = createPatientReferralService(database.db);
const clinicEncounters = createClinicEncountersService(database.db);
const clinicOdontogram = createClinicOdontogramService(database.db);
const clinicTreatments = createClinicTreatmentsService(database.db);
const clinicDashboard = createClinicDashboardService(database.db, integrations, notifications);
const clinicTreatmentPlans = createClinicTreatmentPlansService(database.db);
const clinicServiceCatalog = createClinicServiceCatalogService(database.db);
const clinicInventory = createClinicInventoryService(database.db);
const app = await buildApp({
  config,
  checkDatabase: database.check,
  auth,
  adminClinics,
  adminClinicCreation,
  adminClinicBranchCreation,
  adminClinicDetails,
  adminClinicStatus,
  adminClinicAccountUpdate,
  adminClinicSettings,
  clinicBilling,
  clinicServiceList,
  clinicPrescription,
  clinicFiles,
  clinicAi,
  remoteConsults,
  hmo,
  db: database.db,
  adminDentists,
  adminDentistCreation,
  adminDentistDetails,
  adminDentistAffiliations,
  adminDentistProfileState,
  adminPackages,
  adminSubscriptions,
  adminAudit,
  adminDashboard,
  adminSettings,
  entitlements,
  publicDirectory,
  publicBooking,
  clinicSettings,
  clinicWorkspace,
  clinicPatients,
  patientReferrals,
  clinicEncounters,
  clinicOdontogram,
  clinicTreatments,
  clinicRecalls,
  clinicReports,
  subscriptionOperations,
  clinicStaff,
  patientPortal,
  verification,
  reviews,
  organizations,
  clinicAnalytics,
  payments,
  customDomains,
  integrations,
  notificationProviders,
  platformOperations,
  retention,
  securityAlerts,
  metrics,
  aiImaging,
  kiosk,
  profiles,
  dentistProfiles,
  clinicDashboard,
  clinicTreatmentPlans,
  clinicServiceCatalog,
  clinicInventory,
  notifications,
});

app.addHook('onClose', async () => {
  await database.close();
});

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  app.log.info({ signal }, 'Shutting down API server');

  try {
    await app.close();
    process.exitCode = 0;
  } catch (error) {
    app.log.error({ err: error }, 'API shutdown failed');
    process.exitCode = 1;
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: config.host, port: config.port });
  // Recover any webhook deliveries left queued past their retry time by an
  // earlier process restart — in-process retry timers don't survive a restart.
  integrations.processDueDeliveries().catch((error: unknown) => app.log.error({ err: error }, 'Webhook delivery sweep failed'));
  notifications.processDue().catch((error: unknown) => app.log.error({ err: error }, 'Notification delivery sweep failed'));
  retention.scan().catch((error: unknown) => app.log.error({ err: error }, 'Data retention review scan failed'));
  securityAlerts.scan().catch((error: unknown) => app.log.error({ err: error }, 'Security alert scan failed'));
} catch (error) {
  app.log.error({ err: error }, 'API failed to start');
  await app.close();
  process.exitCode = 1;
}
