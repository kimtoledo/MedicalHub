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

const config = loadConfig();
const database = await createDatabaseServices();
const auth = createAuthServices(config, database.db);
const adminClinics = createAdminClinicListService(database.db);
const adminClinicCreation = createAdminClinicCreationService(database.db);
const adminClinicBranchCreation = createAdminClinicBranchCreationService(database.db);
const adminClinicDetails = createAdminClinicDetailService(database.db);
const adminClinicStatus = createAdminClinicStatusService(database.db);
const clinicBilling = createClinicBillingService(database.db);
const clinicServiceList = createClinicServiceListService(database.db);
const clinicPrescription = createClinicPrescriptionService(database.db);
const clinicFiles = createClinicFilesService(database.db);
const llmProvider = createLLMProvider();
const clinicAi = createAiAssistanceService(database.db, llmProvider);
const remoteConsults = createRemoteConsultsService(database.db);
const hmo = createHmoService(database.db);
const adminClinicSettings = createAdminClinicSettingsService(database.db);
const app = await buildApp({
  config,
  checkDatabase: database.check,
  auth,
  adminClinics,
  adminClinicCreation,
  adminClinicBranchCreation,
  adminClinicDetails,
  adminClinicStatus,
  clinicBilling,
  clinicServiceList,
  clinicPrescription,
  clinicFiles,
  clinicAi,
  remoteConsults,
  hmo,
  db: database.db,
  adminClinicSettings,
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
