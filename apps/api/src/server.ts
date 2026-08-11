import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabaseServices } from './database.js';
import { createAuthServices } from './auth/service.js';
import {
  createAdminClinicCreationService,
  createAdminClinicBranchCreationService,
  createAdminClinicDetailService,
  createAdminClinicListService,
  createAdminClinicStatusService,
} from './admin/clinics-service.js';
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
import { createEntitlementService } from './entitlements/service.js';
import { createPublicDirectoryService } from './public/directory-service.js';
import { createClinicSettingsService } from './clinic/settings-service.js';

const config = loadConfig();
const database = await createDatabaseServices();
const auth = createAuthServices(config, database.db);
const adminClinics = createAdminClinicListService(database.db);
const adminClinicCreation = createAdminClinicCreationService(database.db);
const adminClinicBranchCreation = createAdminClinicBranchCreationService(database.db);
const adminClinicDetails = createAdminClinicDetailService(database.db);
const adminClinicStatus = createAdminClinicStatusService(database.db);
const adminClinicSettings = createAdminClinicSettingsService(database.db);
const adminDentists = createAdminDentistListService(database.db);
const adminDentistCreation = createAdminDentistCreationService(database.db);
const adminDentistDetails = createAdminDentistDetailService(database.db);
const adminDentistAffiliations = createAdminDentistAffiliationService(database.db);
const adminDentistProfileState = createAdminDentistProfileStateService(database.db);
const adminPackages = createAdminPackageService(database.db);
const adminSubscriptions = createAdminSubscriptionListService(database.db);
const entitlements = createEntitlementService(database.db);
const publicDirectory = createPublicDirectoryService(database.db);
const clinicSettings = createClinicSettingsService(database.db);
const app = await buildApp({
  config,
  checkDatabase: database.check,
  auth,
  adminClinics,
  adminClinicCreation,
  adminClinicBranchCreation,
  adminClinicDetails,
  adminClinicStatus,
  adminClinicSettings,
  adminDentists,
  adminDentistCreation,
  adminDentistDetails,
  adminDentistAffiliations,
  adminDentistProfileState,
  adminPackages,
  adminSubscriptions,
  entitlements,
  publicDirectory,
  clinicSettings,
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
} catch (error) {
  app.log.error({ err: error }, 'API failed to start');
  await app.close();
  process.exitCode = 1;
}
