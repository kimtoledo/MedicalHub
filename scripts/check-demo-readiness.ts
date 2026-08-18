/** Read-only, non-secret presentation readiness checks. */
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { FeatureKey } from '@dentra/shared';
import * as schema from '../packages/db/src/schema';
import {
  DEMO_IDS,
  presentationDate,
  presentationScenario,
  PRESENTATION_STATUSES,
  scenarioIds,
  weekdayInManila,
} from './demo-presentation-config';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(sql, { schema });

type Check = { label: string; passed: boolean; detail: string };
const requiredFeatures = [
  FeatureKey.APPOINTMENTS_MANAGE,
  FeatureKey.PATIENTS_MANAGE,
  FeatureKey.CLINICAL_RECORDS,
  FeatureKey.TREATMENT_RECORDS,
  FeatureKey.SERVICE_CATALOG,
  FeatureKey.BILLING_INVOICES,
  FeatureKey.BILLING_PAYMENTS,
] as const;

async function check() {
  const date = presentationDate();
  const scenario = presentationScenario();
  const ids = scenarioIds(scenario);
  const weekday = weekdayInManila(date);

  const [clinic, admin, dentistAccess, subscription, services, appointments, hours, schedule, closures, featureRows, candidate] = await Promise.all([
    db.select({ status: schema.clinics.status, maintenanceMode: schema.clinics.maintenanceMode, publicationStatus: schema.clinics.publicationStatus }).from(schema.clinics).where(eq(schema.clinics.id, DEMO_IDS.clinic)).limit(1),
    db.select({ isActive: schema.users.isActive, platformRole: schema.users.platformRole }).from(schema.users).where(eq(schema.users.id, DEMO_IDS.adminUser)).limit(1),
    db.select({ role: schema.clinicMemberships.role, isActive: schema.clinicMemberships.isActive, dentistId: schema.clinicMemberships.dentistId, branchId: schema.clinicMemberships.branchId, licenseNumber: schema.dentists.licenseNumber, verificationStatus: schema.dentists.verificationStatus }).from(schema.clinicMemberships).innerJoin(schema.dentists, eq(schema.dentists.id, schema.clinicMemberships.dentistId)).where(and(eq(schema.clinicMemberships.id, DEMO_IDS.dentistMembership), eq(schema.clinicMemberships.clinicId, DEMO_IDS.clinic))).limit(1),
    db.select({ status: schema.clinicSubscriptions.status, expiresAt: schema.clinicSubscriptions.expiresAt, packageId: schema.clinicSubscriptions.packageId }).from(schema.clinicSubscriptions).where(and(eq(schema.clinicSubscriptions.id, DEMO_IDS.subscription), eq(schema.clinicSubscriptions.clinicId, DEMO_IDS.clinic))).limit(1),
    db.select({ id: schema.services.id, workflowMode: schema.services.workflowMode, isActive: schema.services.isActive }).from(schema.services).where(and(eq(schema.services.clinicId, DEMO_IDS.clinic), inArray(schema.services.id, [DEMO_IDS.cleaningService, DEMO_IDS.bracesService]))),
    db.select({ id: schema.appointments.id, status: schema.appointments.status, startsAt: schema.appointments.startsAt, patientId: schema.appointments.patientId }).from(schema.appointments).where(and(eq(schema.appointments.clinicId, DEMO_IDS.clinic), inArray(schema.appointments.id, ids.appointments))),
    db.select({ opensAt: schema.branchHours.opensAt, closesAt: schema.branchHours.closesAt, isClosed: schema.branchHours.isClosed }).from(schema.branchHours).where(and(eq(schema.branchHours.branchId, DEMO_IDS.branch), eq(schema.branchHours.weekday, weekday))).limit(1),
    db.select({ startsAt: schema.dentistSchedules.startsAt, endsAt: schema.dentistSchedules.endsAt }).from(schema.dentistSchedules).where(and(eq(schema.dentistSchedules.dentistId, DEMO_IDS.dentist), eq(schema.dentistSchedules.branchId, DEMO_IDS.branch), eq(schema.dentistSchedules.weekday, weekday))).limit(1),
    db.select({ id: schema.clinicClosures.id }).from(schema.clinicClosures).where(and(eq(schema.clinicClosures.clinicId, DEMO_IDS.clinic), eq(schema.clinicClosures.date, date), eq(schema.clinicClosures.isEnabled, true))).limit(1),
    db.select({ featureKey: schema.packageFeatures.featureKey, isEnabled: schema.packageFeatures.isEnabled }).from(schema.packageFeatures).innerJoin(schema.clinicSubscriptions, eq(schema.clinicSubscriptions.packageId, schema.packageFeatures.packageId)).where(and(eq(schema.clinicSubscriptions.id, DEMO_IDS.subscription), eq(schema.packageFeatures.isEnabled, true))),
    db.select({ verificationStatus: schema.dentists.verificationStatus, email: schema.dentists.email }).from(schema.dentists).where(eq(schema.dentists.id, DEMO_IDS.verificationCandidate)).limit(1),
  ]);

  const clinicRow = clinic[0];
  const adminRow = admin[0];
  const dentistRow = dentistAccess[0];
  const subscriptionRow = subscription[0];
  const serviceById = new Map(services.map((row) => [row.id, row]));
  const appointmentStatuses = new Set(appointments.map((row) => row.status));
  const appointmentDates = new Set(appointments.map((row) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(row.startsAt)));
  const enabledFeatures = new Set(featureRows.map((row) => row.featureKey));

  const checks: Check[] = [
    { label: 'Clinic is presentation-ready', passed: clinicRow?.status === 'active' && clinicRow.maintenanceMode === false && clinicRow.publicationStatus === 'published', detail: clinicRow ? `${clinicRow.status}, ${clinicRow.publicationStatus}` : 'missing' },
    { label: 'Super Admin account is active', passed: adminRow?.isActive === 'true' && adminRow.platformRole === 'super_admin', detail: adminRow ? `${adminRow.platformRole}, ${adminRow.isActive}` : 'missing' },
    { label: 'Dentist login is linked by PRC', passed: dentistRow?.role === 'dentist' && dentistRow.isActive === 'true' && dentistRow.dentistId === DEMO_IDS.dentist && dentistRow.branchId === DEMO_IDS.branch && Boolean(dentistRow.licenseNumber), detail: dentistRow ? `${dentistRow.verificationStatus}, PRC linked` : 'missing' },
    { label: 'Subscription remains active', passed: subscriptionRow?.status === 'active' && Boolean(subscriptionRow.expiresAt && subscriptionRow.expiresAt > new Date()), detail: subscriptionRow ? `${subscriptionRow.status}, future expiry` : 'missing' },
    { label: 'Required operational features are enabled', passed: requiredFeatures.every((feature) => enabledFeatures.has(feature)), detail: `${requiredFeatures.filter((feature) => enabledFeatures.has(feature)).length}/${requiredFeatures.length}` },
    { label: 'Cleaning quick service is active', passed: serviceById.get(DEMO_IDS.cleaningService)?.workflowMode === 'quick' && serviceById.get(DEMO_IDS.cleaningService)?.isActive === 'true', detail: serviceById.get(DEMO_IDS.cleaningService)?.workflowMode ?? 'missing' },
    { label: 'Braces adjustment standard service is active', passed: serviceById.get(DEMO_IDS.bracesService)?.workflowMode === 'standard' && serviceById.get(DEMO_IDS.bracesService)?.isActive === 'true', detail: serviceById.get(DEMO_IDS.bracesService)?.workflowMode ?? 'missing' },
    { label: 'Presentation queue has all four states', passed: appointments.length === 4 && PRESENTATION_STATUSES.every((status) => appointmentStatuses.has(status)), detail: `${appointments.length}/4 appointments` },
    { label: 'Presentation queue is on target Manila date', passed: appointmentDates.size === 1 && appointmentDates.has(date), detail: [...appointmentDates].join(', ') || 'missing' },
    { label: 'Branch hours cover the demo day', passed: hours[0]?.isClosed === false && (hours[0]?.opensAt ?? 1440) <= 480 && (hours[0]?.closesAt ?? 0) >= 1080, detail: hours[0] ? `${hours[0].opensAt}-${hours[0].closesAt}` : 'missing' },
    { label: 'Dentist schedule covers the demo day', passed: (schedule[0]?.startsAt ?? 1440) <= 480 && (schedule[0]?.endsAt ?? 0) >= 1080, detail: schedule[0] ? `${schedule[0].startsAt}-${schedule[0].endsAt}` : 'missing' },
    { label: 'No enabled closure blocks the demo date', passed: closures.length === 0, detail: closures.length ? 'blocked' : 'open' },
    { label: 'Verification candidate is ready', passed: candidate[0]?.verificationStatus === 'pending' && Boolean(candidate[0]?.email), detail: candidate[0]?.verificationStatus ?? 'missing' },
  ];

  console.log(`Dentra.ph presentation readiness — ${date}, scenario ${scenario}`);
  for (const item of checks) console.log(`${item.passed ? '✅' : '❌'}  ${item.label} (${item.detail})`);
  const failed = checks.filter((item) => !item.passed);
  if (failed.length) throw new Error(`${failed.length} presentation readiness check(s) failed`);
  console.log('✅  Presentation scenario is ready. No credentials or patient payloads were printed.');
}

check()
  .catch((error) => {
    console.error(`❌  ${error instanceof Error ? error.message : 'Unable to check presentation readiness'}`);
    process.exitCode = 1;
  })
  .finally(async () => { await sql.end(); });
