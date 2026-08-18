/**
 * Refreshes only deterministic synthetic records used by the presentation.
 * It never deletes data and refuses to reuse a scenario after it has produced
 * an encounter. Use DEMO_SCENARIO=2..9 for another clean demonstration run.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import dotenv from 'dotenv';
import postgres from 'postgres';
import * as schema from '../packages/db/src/schema';
import {
  atManilaTime,
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

const patients = [
  { firstName: 'Maya', lastName: 'Demo-Completed', patientNumber: 'SBD-DEMO-COMPLETED', phone: '09170000031' },
  { firstName: 'Nico', lastName: 'Demo-Treatment', patientNumber: 'SBD-DEMO-TREATMENT', phone: '09170000032' },
  { firstName: 'Ariel', lastName: 'Demo-Ready', patientNumber: 'SBD-DEMO-READY', phone: '09170000033' },
  { firstName: 'Bea', lastName: 'Demo-Upcoming', patientNumber: 'SBD-DEMO-UPCOMING', phone: '09170000034' },
] as const;

const slots = [
  { hour: 8, duration: 45, serviceId: DEMO_IDS.cleaningService },
  { hour: 9, duration: 30, serviceId: DEMO_IDS.bracesService },
  { hour: 10, duration: 45, serviceId: DEMO_IDS.cleaningService },
  { hour: 14, duration: 30, serviceId: DEMO_IDS.bracesService },
] as const;

async function prepare() {
  const date = presentationDate();
  const scenario = presentationScenario();
  const ids = scenarioIds(scenario);
  const now = new Date();
  const weekday = weekdayInManila(date);

  const [consumed] = await db
    .select({ id: schema.encounters.id })
    .from(schema.encounters)
    .where(and(
      eq(schema.encounters.clinicId, DEMO_IDS.clinic),
      inArray(schema.encounters.appointmentId, ids.appointments),
    ))
    .limit(1);

  if (consumed) {
    throw new Error(`Presentation scenario ${scenario} already has clinical history. Preserve it and rerun with DEMO_SCENARIO=${scenario + 1}.`);
  }

  await db.transaction(async (tx) => {
    await tx.update(schema.clinics).set({
      status: 'active',
      maintenanceMode: false,
      publicationStatus: 'published',
      updatedAt: now,
    }).where(eq(schema.clinics.id, DEMO_IDS.clinic));

    await tx.update(schema.clinicSubscriptions).set({
      status: 'active',
      startsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    }).where(and(
      eq(schema.clinicSubscriptions.id, DEMO_IDS.subscription),
      eq(schema.clinicSubscriptions.clinicId, DEMO_IDS.clinic),
    ));

    await tx.update(schema.dentists).set({
      licenseNumber: 'PRCDEN2015001234',
      verificationStatus: 'verified',
      publicationStatus: 'published',
      deletedAt: null,
      updatedAt: now,
    }).where(eq(schema.dentists.id, DEMO_IDS.dentist));

    await tx.update(schema.dentists).set({
      verificationStatus: 'pending',
      updatedAt: now,
    }).where(eq(schema.dentists.id, DEMO_IDS.verificationCandidate));

    await tx.update(schema.users).set({
      isActive: 'true',
      deletedAt: null,
      updatedAt: now,
    }).where(inArray(schema.users.id, [DEMO_IDS.adminUser, DEMO_IDS.dentistUser]));

    await tx.insert(schema.clinicMemberships).values({
      id: DEMO_IDS.dentistMembership,
      userId: DEMO_IDS.dentistUser,
      clinicId: DEMO_IDS.clinic,
      branchId: DEMO_IDS.branch,
      role: 'dentist',
      dentistId: DEMO_IDS.dentist,
      isActive: 'true',
      joinedAt: now.toISOString(),
    }).onConflictDoUpdate({
      target: schema.clinicMemberships.id,
      set: {
        branchId: DEMO_IDS.branch,
        role: 'dentist',
        dentistId: DEMO_IDS.dentist,
        isActive: 'true',
        updatedAt: now,
      },
    });

    await tx.update(schema.dentistBranchAssignments).set({
      isActive: 'true',
      updatedAt: now,
    }).where(and(
      eq(schema.dentistBranchAssignments.clinicId, DEMO_IDS.clinic),
      eq(schema.dentistBranchAssignments.branchId, DEMO_IDS.branch),
      eq(schema.dentistBranchAssignments.dentistId, DEMO_IDS.dentist),
    ));

    await tx.insert(schema.services).values([
      {
        id: DEMO_IDS.cleaningService,
        clinicId: DEMO_IDS.clinic,
        name: 'Prophylaxis (Cleaning)',
        category: 'Preventive',
        description: 'Professional teeth cleaning and polishing.',
        durationMinutes: '45',
        pricePhp: '800.00',
        workflowMode: 'quick',
        isBookable: true,
        isActive: 'true',
      },
      {
        id: DEMO_IDS.bracesService,
        clinicId: DEMO_IDS.clinic,
        name: 'Braces Adjustment',
        category: 'Orthodontics',
        description: 'Routine orthodontic adjustment and progress check.',
        durationMinutes: '30',
        pricePhp: '1200.00',
        workflowMode: 'standard',
        isBookable: true,
        isActive: 'true',
      },
    ]).onConflictDoUpdate({
      target: schema.services.id,
      set: {
        name: 'Prophylaxis (Cleaning)',
        category: 'Preventive',
        description: 'Professional teeth cleaning and polishing.',
        durationMinutes: '45',
        pricePhp: '800.00',
        workflowMode: 'quick',
        isBookable: true,
        isActive: 'true',
        updatedAt: now,
      },
    });

    // The multi-row upsert above applies one update shape. Restore the braces
    // item explicitly so its standard workflow remains truthful.
    await tx.update(schema.services).set({
      name: 'Braces Adjustment',
      category: 'Orthodontics',
      description: 'Routine orthodontic adjustment and progress check.',
      durationMinutes: '30',
      pricePhp: '1200.00',
      workflowMode: 'standard',
      isBookable: true,
      isActive: 'true',
      updatedAt: now,
    }).where(and(
      eq(schema.services.id, DEMO_IDS.bracesService),
      eq(schema.services.clinicId, DEMO_IDS.clinic),
    ));

    await tx.insert(schema.branchHours).values({
      branchId: DEMO_IDS.branch,
      weekday,
      opensAt: 480,
      closesAt: 1080,
      isClosed: false,
    }).onConflictDoUpdate({
      target: [schema.branchHours.branchId, schema.branchHours.weekday],
      set: { opensAt: 480, closesAt: 1080, isClosed: false, updatedAt: now },
    });

    await tx.insert(schema.dentistSchedules).values({
      dentistId: DEMO_IDS.dentist,
      branchId: DEMO_IDS.branch,
      weekday,
      startsAt: 480,
      endsAt: 1080,
    }).onConflictDoUpdate({
      target: [schema.dentistSchedules.dentistId, schema.dentistSchedules.branchId, schema.dentistSchedules.weekday],
      set: { startsAt: 480, endsAt: 1080, updatedAt: now },
    });

    await tx.update(schema.clinicClosures).set({ isEnabled: false, updatedAt: now }).where(and(
      eq(schema.clinicClosures.clinicId, DEMO_IDS.clinic),
      eq(schema.clinicClosures.date, date),
    ));

    for (const [index, patient] of patients.entries()) {
      const row = {
        id: ids.patients[index],
        clinicId: DEMO_IDS.clinic,
        patientNumber: `${patient.patientNumber}-S${scenario}`,
        firstName: patient.firstName,
        lastName: `${patient.lastName}-S${scenario}`,
        dateOfBirth: `199${index}-0${index + 1}-1${index}`,
        sex: index % 2 ? 'male' : 'female',
        phone: patient.phone,
        email: `presentation.patient${scenario}${index + 1}@example.test`,
        address: 'Synthetic presentation address only',
        city: 'Quezon City',
        province: 'Metro Manila',
        status: 'active',
        notes: `Synthetic Dentra.ph presentation scenario ${scenario}.`,
        deletedAt: null,
      };
      await tx.insert(schema.patients).values(row).onConflictDoUpdate({
        target: schema.patients.id,
        set: { ...row, updatedAt: now },
      });
    }

    const appointmentRows = PRESENTATION_STATUSES.map((status, index) => {
      const startsAt = atManilaTime(date, slots[index].hour);
      const endsAt = new Date(startsAt.getTime() + slots[index].duration * 60_000);
      const patient = patients[index];
      return {
        id: ids.appointments[index],
        clinicId: DEMO_IDS.clinic,
        branchId: DEMO_IDS.branch,
        dentistId: DEMO_IDS.dentist,
        serviceId: slots[index].serviceId,
        patientId: ids.patients[index],
        status,
        startsAt,
        endsAt,
        patientFirstName: patient.firstName,
        patientLastName: `${patient.lastName}-S${scenario}`,
        patientPhone: patient.phone,
        patientEmail: `presentation.patient${scenario}${index + 1}@example.test`,
        chiefComplaint: status === 'in_progress' ? 'Routine braces adjustment' : 'Routine cleaning and check-up',
        notes: `DENTRA_PRESENTATION_SCENARIO:${scenario}:${date}`,
        bookedBy: DEMO_IDS.dentistUser,
        confirmedAt: new Date(startsAt.getTime() - 24 * 60 * 60 * 1000),
        checkedInAt: status === 'confirmed' ? null : new Date(startsAt.getTime() - 10 * 60 * 1000),
        completedAt: status === 'completed' ? endsAt : null,
        cancelledAt: null,
        cancellationReason: null,
      };
    });

    for (const [index, row] of appointmentRows.entries()) {
      await tx.insert(schema.appointments).values(row).onConflictDoUpdate({
        target: schema.appointments.id,
        set: { ...row, updatedAt: now },
      });
      await tx.insert(schema.appointmentStatusHistory).values({
        id: ids.histories[index],
        appointmentId: row.id,
        clinicId: DEMO_IDS.clinic,
        fromStatus: null,
        toStatus: row.status,
        changedBy: DEMO_IDS.dentistUser,
        reason: `Synthetic presentation scenario ${scenario} preparation`,
      }).onConflictDoUpdate({
        target: schema.appointmentStatusHistory.id,
        set: { toStatus: row.status, reason: `Synthetic presentation scenario ${scenario} preparation`, updatedAt: now },
      });
    }
  });

  console.log(`✅  Presentation scenario ${scenario} prepared for ${date} (Asia/Manila).`);
  console.log('    Refreshed only fixed synthetic Smile Bright Dental scenario records.');
}

prepare()
  .catch((error) => {
    console.error(`❌  ${error instanceof Error ? error.message : 'Unable to prepare presentation scenario'}`);
    process.exitCode = 1;
  })
  .finally(async () => { await sql.end(); });
