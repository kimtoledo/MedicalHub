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
import { createAdminDentistListService } from './admin/dentists-service.js';

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
