/**
 * seed-demo.ts — ToothHub PH Demo Data Seeder
 *
 * Inserts entirely synthetic, Philippine-flavored data for demonstration.
 * All UUIDs are deterministic constants — running this script twice is safe
 * (uses onConflictDoNothing so re-seeding never errors).
 *
 * Requirements: DATABASE_URL must be set in environment.
 * Usage: npx tsx scripts/seed-demo.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../packages/db/src/schema';

// ---------------------------------------------------------------------------
// DB connection
// ---------------------------------------------------------------------------
if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Set it in Replit Secrets first.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(sql, { schema });

// ---------------------------------------------------------------------------
// Deterministic UUID constants — never change these after the first seed run
// ---------------------------------------------------------------------------

// Super Admin
const ADMIN_USER_ID = '00000000-0001-0000-0000-000000000001';

// Packages
const PKG_STARTER_ID     = '00000000-0002-0000-0000-000000000001';
const PKG_PRO_ID         = '00000000-0002-0000-0000-000000000002';
const PKG_ENTERPRISE_ID  = '00000000-0002-0000-0000-000000000003';

// Clinics
const CLINIC_SBD_ID      = '00000000-0003-0000-0000-000000000001'; // Smile Bright Dental
const CLINIC_BSM_ID      = '00000000-0003-0000-0000-000000000002'; // BrightSmile Dental Clinic

// Branches — Smile Bright Dental (2 branches)
const BRANCH_SBD_MAIN_ID = '00000000-0004-0000-0000-000000000001';
const BRANCH_SBD_B2_ID   = '00000000-0004-0000-0000-000000000002';

// Branch — BrightSmile (1 branch)
const BRANCH_BSM_MAIN_ID = '00000000-0004-0000-0000-000000000003';

// Dentists
const DENTIST_REYES_ID   = '00000000-0005-0000-0000-000000000001'; // Dr. Maria Reyes
const DENTIST_SANTOS_ID  = '00000000-0005-0000-0000-000000000002'; // Dr. Jose Santos
const DENTIST_CRUZ_ID    = '00000000-0005-0000-0000-000000000003'; // Dr. Ana Cruz
const DENTIST_GARCIA_ID  = '00000000-0005-0000-0000-000000000004'; // Dr. Roberto Garcia

// Staff users — Smile Bright Dental
const USER_SBD_ADMIN_ID  = '00000000-0006-0000-0000-000000000001';
const USER_SBD_RECEP_ID  = '00000000-0006-0000-0000-000000000002';
const USER_SBD_ASST_ID   = '00000000-0006-0000-0000-000000000003';

// Staff users — BrightSmile
const USER_BSM_ADMIN_ID  = '00000000-0006-0000-0000-000000000004';
const USER_BSM_RECEP_ID  = '00000000-0006-0000-0000-000000000005';
const USER_BSM_ASST_ID   = '00000000-0006-0000-0000-000000000006';

// Subscriptions
const SUB_SBD_ID         = '00000000-0007-0000-0000-000000000001';
const SUB_BSM_ID         = '00000000-0007-0000-0000-000000000002';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date();

function daysFromNow(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return d;
}

function hoursOn(base: Date, h: number, m = 0): Date {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60 * 1000);
}

// Philippine feature flags per package
const STARTER_FEATURES = [
  'appointments.manage',
  'appointments.calendar',
  'patients.manage',
  'staff.manage',
  'reports.basic',
];

const PRO_FEATURES = [
  ...STARTER_FEATURES,
  'booking.public',
  'clinical.records',
  'clinical.odontogram',
  'clinical.encounters',
  'clinical.treatment_records',
  'roles.manage',
  'microsite.publish',
  'branches.multi',
  'reports.advanced',
];

const ENTERPRISE_FEATURES = [
  ...PRO_FEATURES,
  'billing.invoices',
  'billing.payments',
  'clinical.prescriptions',
  'inventory.manage',
  'clinical.radiographs',
  'microsite.customize',
];

// Filipino first/last name pools
const FIRST_NAMES_F = [
  'Maria', 'Ana', 'Rose', 'Liza', 'Carmen', 'Gabrielle', 'Kristine', 'Patricia',
  'Jennifer', 'Michelle', 'Maricel', 'Rowena', 'Alicia', 'Fernanda', 'Clarissa',
  'Marilou', 'Divina', 'Sheryl', 'Lorelei', 'Natividad',
];
const FIRST_NAMES_M = [
  'Jose', 'Juan', 'Roberto', 'Eduardo', 'Ramon', 'Carlos', 'Miguel', 'Antonio',
  'Ricardo', 'Fernando', 'Emmanuel', 'Aldrin', 'Rogelio', 'Bonifacio', 'Danilo',
  'Renato', 'Noel', 'Ariel', 'Gerry', 'Rolando',
];
const LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Torres', 'Flores',
  'Villanueva', 'Mendoza', 'Ramos', 'Aquino', 'Dela Cruz', 'Castillo',
  'Soriano', 'Aguilar', 'Pascual', 'Manalo', 'Abad', 'Ocampo', 'Dizon',
];
const QC_BARANGAYS = [
  'Batasan Hills', 'Commonwealth', 'Tandang Sora', 'Bagumbayan', 'Cubao',
  'Diliman', 'Kamuning', 'Pinyahan', 'Ugong Norte', 'Bagong Pag-asa',
  'Loyola Heights', 'New Manila', 'Project 4', 'Project 8', 'Talipapa',
  'Balintawak', 'Pasong Tamo', 'Novaliches', 'San Agustin', 'Holy Spirit',
];
const MAKATI_BARANGAYS = [
  'Bel-Air', 'Forbes Park', 'Pio del Pilar', 'Poblacion', 'Palanan',
  'San Isidro', 'Bangkal', 'Cembo', 'Comembo', 'Guadalupe Nuevo',
  'Guadalupe Viejo', 'Kasilawan', 'Magallanes', 'Pembo', 'Pinagkaisahan',
  'San Antonio', 'San Lorenzo', 'Santa Cruz', 'Tejeros', 'West Rembo',
];

const COMPLAINTS = [
  'Toothache on lower left molar',
  'Routine cleaning and check-up',
  'Chipped front tooth',
  'Swollen gums upper right',
  'Sensitivity to cold drinks',
  'Missing filling fell out',
  'Jaw pain and clicking',
  'Teeth whitening consultation',
  'Wisdom tooth discomfort',
  'Follow-up on previous root canal',
];

const TOOTH_NUMBERS = ['16', '26', '36', '46', '11', '21', '14', '24', '17', '37'];
const CONDITION_CODES = ['caries', 'missing', 'fracture', 'root_fragment', 'crown'];
const PROCEDURE_CODES = ['composite_filling', 'extraction', 'root_canal', 'crown_placement', 'scaling'];

// ---------------------------------------------------------------------------
// Patients data builders
// ---------------------------------------------------------------------------

function makePatients(
  clinicId: string,
  prefix: string,
  barangays: string[],
  city: string,
  province: string,
  count = 20,
) {
  return Array.from({ length: count }, (_, i) => {
    const isFemale = i % 2 === 0;
    const firstName = isFemale ? FIRST_NAMES_F[i % FIRST_NAMES_F.length] : FIRST_NAMES_M[i % FIRST_NAMES_M.length];
    const lastName  = LAST_NAMES[i % LAST_NAMES.length];
    const yearOfBirth = 1960 + ((i * 3 + 7) % 50);
    return {
      id: `${prefix}${String(i + 1).padStart(3, '0')}-0000-0000-0000-000000000001`.replace('00000000-0008-', `00000000-0008-${prefix}`).slice(0, 36),
      clinicId,
      patientNumber: `${prefix}-${String(i + 1).padStart(4, '0')}`,
      firstName,
      lastName,
      middleName: LAST_NAMES[(i + 5) % LAST_NAMES.length].split(' ')[0],
      dateOfBirth: `${yearOfBirth}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      sex: isFemale ? 'female' : 'male',
      civilStatus: ['single', 'married', 'widowed'][i % 3],
      occupation: ['Teacher', 'Engineer', 'Nurse', 'Driver', 'Housewife', 'Accountant', 'Student', 'Contractor'][i % 8],
      nationality: 'Filipino',
      phone: `09${String(10 + (i * 7) % 90).padStart(2, '0')}${String(1000000 + i * 31337).slice(-7)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(' ', '')}${i}@email.ph`,
      address: `${i + 1} ${barangays[i % barangays.length]} St.`,
      city,
      province,
      emergencyContactName: `${FIRST_NAMES_F[(i + 3) % FIRST_NAMES_F.length]} ${LAST_NAMES[(i + 3) % LAST_NAMES.length]}`,
      emergencyContactPhone: `09${String(20 + (i * 11) % 80).padStart(2, '0')}${String(2000000 + i * 12345).slice(-7)}`,
      emergencyContactRelation: ['Spouse', 'Parent', 'Sibling', 'Child'][i % 4],
      status: 'active',
    };
  });
}

// ---------------------------------------------------------------------------
// Appointment + clinical data builder
// ---------------------------------------------------------------------------

type AptStatus = 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

const APPOINTMENT_PATTERN: AptStatus[] = [
  'completed', 'completed', 'completed', 'completed', 'completed',
  'completed', 'completed', 'completed',
  'confirmed', 'confirmed', 'confirmed',
  'checked_in',
  'cancelled',
  'no_show',
  'confirmed',
];

function makeAppointments(opts: {
  clinicId: string;
  branchId: string;
  dentistId: string;
  serviceId: string;
  patients: { id: string; firstName: string; lastName: string; phone: string }[];
  prefix: string;
  offset: number;
}) {
  const { clinicId, branchId, dentistId, serviceId, patients, prefix, offset } = opts;
  return Array.from({ length: 15 }, (_, i) => {
    const dayOffset = i - 7; // -7 to +7 from now
    const baseDate = daysFromNow(dayOffset);
    const startsAt = hoursOn(baseDate, 8 + (i % 8), i % 2 === 0 ? 0 : 30);
    const endsAt = addMinutes(startsAt, 45);
    const status = APPOINTMENT_PATTERN[i];
    const patient = patients[i % patients.length];
    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled';
    const isCheckedIn = status === 'checked_in';
    const now = NOW;
    return {
      id: `${prefix}${String(offset + i + 1).padStart(3, '0')}-0000-0000-0000-100000000001`.slice(0, 36),
      clinicId,
      branchId,
      dentistId,
      serviceId,
      patientId: patient.id,
      status,
      startsAt,
      endsAt,
      patientFirstName: patient.firstName,
      patientLastName: patient.lastName,
      patientPhone: patient.phone,
      chiefComplaint: COMPLAINTS[i % COMPLAINTS.length],
      confirmedAt: status !== 'pending' ? new Date(startsAt.getTime() - 86400000) : null,
      checkedInAt: isCheckedIn || isCompleted ? new Date(startsAt.getTime() - 600000) : null,
      completedAt: isCompleted ? endsAt : null,
      cancelledAt: isCancelled ? new Date(startsAt.getTime() - 3600000) : null,
      cancellationReason: isCancelled ? 'Patient request — rescheduling' : null,
      bookedBy: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Main seeder
// ---------------------------------------------------------------------------

async function seed() {
  console.log('🌱  ToothHub PH — seeding demo data...\n');

  // ── 1. Super Admin user ────────────────────────────────────────────────────
  console.log('  👤  Super Admin user...');
  await db.insert(schema.users).values({
    id: ADMIN_USER_ID,
    email: 'admin@toothhub.ph',
    firstName: 'ToothHub',
    lastName: 'Admin',
    phone: '09171234567',
    platformRole: 'super_admin',
    isActive: 'true',
  }).onConflictDoNothing();

  // ── 2. Packages ────────────────────────────────────────────────────────────
  console.log('  📦  Packages...');
  await db.insert(schema.packages).values([
    {
      id: PKG_STARTER_ID,
      name: 'Starter',
      slug: 'starter',
      description: 'Essential tools for solo practitioners and small clinics.',
      isActive: true,
      sortOrder: '1',
    },
    {
      id: PKG_PRO_ID,
      name: 'Professional',
      slug: 'professional',
      description: 'Full clinic suite with clinical records, odontogram, and online booking.',
      isActive: true,
      sortOrder: '2',
    },
    {
      id: PKG_ENTERPRISE_ID,
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Full-featured platform with billing, inventory, and multi-branch support.',
      isActive: true,
      sortOrder: '3',
    },
  ]).onConflictDoNothing();

  // Package features
  console.log('  🔑  Package features...');
  const featureRows = [
    ...STARTER_FEATURES.map((key, i) => ({
      id: `00000000-0009-0001-${String(i).padStart(4, '0')}-000000000001`,
      packageId: PKG_STARTER_ID,
      featureKey: key,
      isEnabled: true,
    })),
    ...PRO_FEATURES.map((key, i) => ({
      id: `00000000-0009-0002-${String(i).padStart(4, '0')}-000000000001`,
      packageId: PKG_PRO_ID,
      featureKey: key,
      isEnabled: true,
    })),
    ...ENTERPRISE_FEATURES.map((key, i) => ({
      id: `00000000-0009-0003-${String(i).padStart(4, '0')}-000000000001`,
      packageId: PKG_ENTERPRISE_ID,
      featureKey: key,
      isEnabled: true,
    })),
  ];
  await db.insert(schema.packageFeatures).values(featureRows).onConflictDoNothing();

  // ── 3. Clinics ─────────────────────────────────────────────────────────────
  console.log('  🏥  Clinics...');
  await db.insert(schema.clinics).values([
    {
      id: CLINIC_SBD_ID,
      name: 'Smile Bright Dental',
      slug: 'smile-bright-dental',
      status: 'active',
      publicationStatus: 'published',
      email: 'hello@smilebrightdental.ph',
      phone: '028123456',
      description: 'Providing quality dental care to Quezon City families since 2010.',
      address: '123 Katipunan Avenue, Loyola Heights',
      city: 'Quezon City',
      province: 'Metro Manila',
    },
    {
      id: CLINIC_BSM_ID,
      name: 'BrightSmile Dental Clinic',
      slug: 'brightsmile-dental-clinic',
      status: 'trial',
      publicationStatus: 'draft',
      email: 'info@brightsmile.ph',
      phone: '028987654',
      description: 'Modern dental clinic serving Makati professionals.',
      address: '456 Ayala Avenue Extension, Bel-Air',
      city: 'Makati',
      province: 'Metro Manila',
    },
  ]).onConflictDoNothing();

  // ── 4. Branches ────────────────────────────────────────────────────────────
  console.log('  🏢  Branches...');
  await db.insert(schema.branches).values([
    {
      id: BRANCH_SBD_MAIN_ID,
      clinicId: CLINIC_SBD_ID,
      name: 'Katipunan Main',
      isMain: true,
      phone: '028123456',
      email: 'katipunan@smilebrightdental.ph',
      address: '123 Katipunan Avenue, Loyola Heights',
      city: 'Quezon City',
      province: 'Metro Manila',
      isActive: true,
    },
    {
      id: BRANCH_SBD_B2_ID,
      clinicId: CLINIC_SBD_ID,
      name: 'Commonwealth Branch',
      isMain: false,
      phone: '028765432',
      email: 'commonwealth@smilebrightdental.ph',
      address: '789 Commonwealth Avenue, Batasan Hills',
      city: 'Quezon City',
      province: 'Metro Manila',
      isActive: true,
    },
    {
      id: BRANCH_BSM_MAIN_ID,
      clinicId: CLINIC_BSM_ID,
      name: 'Ayala Main',
      isMain: true,
      phone: '028987654',
      email: 'ayala@brightsmile.ph',
      address: '456 Ayala Avenue Extension, Bel-Air',
      city: 'Makati',
      province: 'Metro Manila',
      isActive: true,
    },
  ]).onConflictDoNothing();

  // ── 5. Dentists ────────────────────────────────────────────────────────────
  console.log('  🦷  Dentists...');
  await db.insert(schema.dentists).values([
    {
      id: DENTIST_REYES_ID,
      slug: 'dr-maria-reyes',
      firstName: 'Maria',
      lastName: 'Reyes',
      licenseNumber: 'PRC-DEN-2015-001234',
      specialty: 'General Dentistry',
      bio: 'Dr. Maria Reyes has been practicing general dentistry in Quezon City for over 10 years.',
      phone: '09181234567',
      email: 'dr.reyes@smilebrightdental.ph',
      verificationStatus: 'verified',
      publicationStatus: 'published',
    },
    {
      id: DENTIST_SANTOS_ID,
      slug: 'dr-jose-santos',
      firstName: 'Jose',
      lastName: 'Santos',
      licenseNumber: 'PRC-DEN-2018-005678',
      specialty: 'Orthodontics',
      bio: 'Dr. Jose Santos specializes in orthodontics and invisible braces.',
      phone: '09189876543',
      email: 'dr.santos@smilebrightdental.ph',
      verificationStatus: 'verified',
      publicationStatus: 'published',
    },
    {
      id: DENTIST_CRUZ_ID,
      slug: 'dr-ana-cruz',
      firstName: 'Ana',
      lastName: 'Cruz',
      licenseNumber: 'PRC-DEN-2019-009012',
      specialty: 'Endodontics',
      bio: 'Dr. Ana Cruz is an endodontic specialist performing root canal treatments.',
      phone: '09195551234',
      email: 'dr.cruz@brightsmile.ph',
      verificationStatus: 'verified',
      publicationStatus: 'published',
    },
    {
      id: DENTIST_GARCIA_ID,
      slug: 'dr-roberto-garcia',
      firstName: 'Roberto',
      lastName: 'Garcia',
      licenseNumber: 'PRC-DEN-2020-011234',
      specialty: 'Oral Surgery',
      bio: 'Dr. Roberto Garcia handles complex extractions and oral surgical procedures.',
      phone: '09173456789',
      email: 'dr.garcia@brightsmile.ph',
      verificationStatus: 'pending',
      publicationStatus: 'draft',
    },
  ]).onConflictDoNothing();

  // Dentist-branch assignments
  console.log('  🔗  Dentist-branch assignments...');
  await db.insert(schema.dentistBranchAssignments).values([
    {
      id: '00000000-000a-0001-0000-000000000001',
      dentistId: DENTIST_REYES_ID,
      branchId: BRANCH_SBD_MAIN_ID,
      clinicId: CLINIC_SBD_ID,
      isActive: 'true',
    },
    {
      id: '00000000-000a-0002-0000-000000000001',
      dentistId: DENTIST_SANTOS_ID,
      branchId: BRANCH_SBD_MAIN_ID,
      clinicId: CLINIC_SBD_ID,
      isActive: 'true',
    },
    {
      id: '00000000-000a-0003-0000-000000000001',
      dentistId: DENTIST_SANTOS_ID,
      branchId: BRANCH_SBD_B2_ID,
      clinicId: CLINIC_SBD_ID,
      isActive: 'true',
    },
    {
      id: '00000000-000a-0004-0000-000000000001',
      dentistId: DENTIST_CRUZ_ID,
      branchId: BRANCH_BSM_MAIN_ID,
      clinicId: CLINIC_BSM_ID,
      isActive: 'true',
    },
    {
      id: '00000000-000a-0005-0000-000000000001',
      dentistId: DENTIST_GARCIA_ID,
      branchId: BRANCH_BSM_MAIN_ID,
      clinicId: CLINIC_BSM_ID,
      isActive: 'true',
    },
  ]).onConflictDoNothing();

  // ── 6. Staff users ─────────────────────────────────────────────────────────
  console.log('  👥  Staff users...');
  await db.insert(schema.users).values([
    // Smile Bright Dental staff
    {
      id: USER_SBD_ADMIN_ID,
      email: 'admin@smilebrightdental.ph',
      firstName: 'Rosario',
      lastName: 'Villanueva',
      phone: '09171112222',
      isActive: 'true',
    },
    {
      id: USER_SBD_RECEP_ID,
      email: 'reception@smilebrightdental.ph',
      firstName: 'Lourdes',
      lastName: 'Aquino',
      phone: '09172223333',
      isActive: 'true',
    },
    {
      id: USER_SBD_ASST_ID,
      email: 'assistant@smilebrightdental.ph',
      firstName: 'Maribel',
      lastName: 'Castillo',
      phone: '09173334444',
      isActive: 'true',
    },
    // BrightSmile staff
    {
      id: USER_BSM_ADMIN_ID,
      email: 'admin@brightsmile.ph',
      firstName: 'Gina',
      lastName: 'Pascual',
      phone: '09174445555',
      isActive: 'true',
    },
    {
      id: USER_BSM_RECEP_ID,
      email: 'reception@brightsmile.ph',
      firstName: 'Cynthia',
      lastName: 'Manalo',
      phone: '09175556666',
      isActive: 'true',
    },
    {
      id: USER_BSM_ASST_ID,
      email: 'assistant@brightsmile.ph',
      firstName: 'Josefina',
      lastName: 'Abad',
      phone: '09176667777',
      isActive: 'true',
    },
  ]).onConflictDoNothing();

  // Clinic memberships
  console.log('  🎫  Clinic memberships...');
  await db.insert(schema.clinicMemberships).values([
    { id: '00000000-000b-0001-0000-000000000001', userId: USER_SBD_ADMIN_ID, clinicId: CLINIC_SBD_ID, branchId: BRANCH_SBD_MAIN_ID, role: 'clinic_admin', isActive: 'true' },
    { id: '00000000-000b-0002-0000-000000000001', userId: USER_SBD_RECEP_ID, clinicId: CLINIC_SBD_ID, branchId: BRANCH_SBD_MAIN_ID, role: 'receptionist', isActive: 'true' },
    { id: '00000000-000b-0003-0000-000000000001', userId: USER_SBD_ASST_ID, clinicId: CLINIC_SBD_ID, branchId: BRANCH_SBD_MAIN_ID, role: 'dental_assistant', isActive: 'true' },
    { id: '00000000-000b-0004-0000-000000000001', userId: USER_BSM_ADMIN_ID, clinicId: CLINIC_BSM_ID, branchId: BRANCH_BSM_MAIN_ID, role: 'clinic_admin', isActive: 'true' },
    { id: '00000000-000b-0005-0000-000000000001', userId: USER_BSM_RECEP_ID, clinicId: CLINIC_BSM_ID, branchId: BRANCH_BSM_MAIN_ID, role: 'receptionist', isActive: 'true' },
    { id: '00000000-000b-0006-0000-000000000001', userId: USER_BSM_ASST_ID, clinicId: CLINIC_BSM_ID, branchId: BRANCH_BSM_MAIN_ID, role: 'dental_assistant', isActive: 'true' },
  ]).onConflictDoNothing();

  // ── 7. Subscriptions ───────────────────────────────────────────────────────
  console.log('  💳  Subscriptions...');
  await db.insert(schema.clinicSubscriptions).values([
    {
      id: SUB_SBD_ID,
      clinicId: CLINIC_SBD_ID,
      packageId: PKG_PRO_ID,
      status: 'active',
      startsAt: daysFromNow(-180),
      expiresAt: daysFromNow(185),
      assignedBy: ADMIN_USER_ID,
      notes: 'Initial Professional plan subscription.',
    },
    {
      id: SUB_BSM_ID,
      clinicId: CLINIC_BSM_ID,
      packageId: PKG_STARTER_ID,
      status: 'trial',
      startsAt: daysFromNow(-14),
      expiresAt: daysFromNow(16),
      assignedBy: ADMIN_USER_ID,
      notes: 'Free trial period.',
    },
  ]).onConflictDoNothing();

  // ── 8. Services ────────────────────────────────────────────────────────────
  console.log('  🛠  Services...');
  const serviceTemplates = [
    { name: 'Prophylaxis (Cleaning)', description: 'Professional teeth cleaning and polishing.', duration: '45' },
    { name: 'Tooth Extraction', description: 'Simple or surgical tooth removal.', duration: '30' },
    { name: 'Composite Filling', description: 'Tooth-colored resin filling for cavities.', duration: '45' },
    { name: 'Root Canal Treatment', description: 'Endodontic therapy to save infected teeth.', duration: '90' },
    { name: 'Dental X-Ray', description: 'Periapical or panoramic radiograph.', duration: '15' },
    { name: 'Teeth Whitening', description: 'In-office bleaching for a brighter smile.', duration: '60' },
  ];

  const SBD_SERVICE_IDS = serviceTemplates.map((_, i) =>
    `00000000-000c-0001-${String(i).padStart(4, '0')}-000000000001`);
  const BSM_SERVICE_IDS = serviceTemplates.map((_, i) =>
    `00000000-000c-0002-${String(i).padStart(4, '0')}-000000000001`);

  await db.insert(schema.services).values([
    ...serviceTemplates.map((s, i) => ({
      id: SBD_SERVICE_IDS[i],
      clinicId: CLINIC_SBD_ID,
      name: s.name,
      description: s.description,
      durationMinutes: s.duration,
      isActive: 'true',
    })),
    ...serviceTemplates.map((s, i) => ({
      id: BSM_SERVICE_IDS[i],
      clinicId: CLINIC_BSM_ID,
      name: s.name,
      description: s.description,
      durationMinutes: s.duration,
      isActive: 'true',
    })),
  ]).onConflictDoNothing();

  // ── 9. Patients ────────────────────────────────────────────────────────────
  console.log('  👨‍👩‍👧‍👦  Patients (40 total)...');
  const sbdPatients = makePatients(CLINIC_SBD_ID, 'SBD', QC_BARANGAYS, 'Quezon City', 'Metro Manila');
  const bsmPatients = makePatients(CLINIC_BSM_ID, 'BSM', MAKATI_BARANGAYS, 'Makati', 'Metro Manila');

  // Fix patient IDs to valid UUIDs
  const sbdPatientIds = sbdPatients.map((_, i) =>
    `00000000-000d-0001-${String(i).padStart(4, '0')}-000000000001`);
  const bsmPatientIds = bsmPatients.map((_, i) =>
    `00000000-000d-0002-${String(i).padStart(4, '0')}-000000000001`);

  const sbdPatientRows = sbdPatients.map((p, i) => ({ ...p, id: sbdPatientIds[i] }));
  const bsmPatientRows = bsmPatients.map((p, i) => ({ ...p, id: bsmPatientIds[i] }));

  await db.insert(schema.patients).values(sbdPatientRows).onConflictDoNothing();
  await db.insert(schema.patients).values(bsmPatientRows).onConflictDoNothing();

  // ── 10. Appointments ───────────────────────────────────────────────────────
  console.log('  📅  Appointments (30 total)...');

  const sbdAppts = makeAppointments({
    clinicId: CLINIC_SBD_ID,
    branchId: BRANCH_SBD_MAIN_ID,
    dentistId: DENTIST_REYES_ID,
    serviceId: SBD_SERVICE_IDS[0],
    patients: sbdPatientRows.map(p => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, phone: p.phone ?? '' })),
    prefix: 'SBD',
    offset: 0,
  });

  const bsmAppts = makeAppointments({
    clinicId: CLINIC_BSM_ID,
    branchId: BRANCH_BSM_MAIN_ID,
    dentistId: DENTIST_CRUZ_ID,
    serviceId: BSM_SERVICE_IDS[0],
    patients: bsmPatientRows.map(p => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, phone: p.phone ?? '' })),
    prefix: 'BSM',
    offset: 0,
  });

  const sbdApptIds = sbdAppts.map((_, i) =>
    `00000000-000e-0001-${String(i).padStart(4, '0')}-000000000001`);
  const bsmApptIds = bsmAppts.map((_, i) =>
    `00000000-000e-0002-${String(i).padStart(4, '0')}-000000000001`);

  const sbdApptRows = sbdAppts.map((a, i) => ({ ...a, id: sbdApptIds[i] }));
  const bsmApptRows = bsmAppts.map((a, i) => ({ ...a, id: bsmApptIds[i] }));

  await db.insert(schema.appointments).values(sbdApptRows).onConflictDoNothing();
  await db.insert(schema.appointments).values(bsmApptRows).onConflictDoNothing();

  // ── 11. Encounters + treatment records + odontogram events ─────────────────
  console.log('  🩺  Encounters, treatment records, and odontogram events...');

  const completedSbd = sbdApptRows.filter(a => a.status === 'completed');
  const completedBsm = bsmApptRows.filter(a => a.status === 'completed');

  const encounterRows = [
    ...completedSbd.map((a, i) => ({
      id: `00000000-000f-0001-${String(i).padStart(4, '0')}-000000000001`,
      clinicId: CLINIC_SBD_ID,
      branchId: BRANCH_SBD_MAIN_ID,
      patientId: a.patientId!,
      dentistId: DENTIST_REYES_ID,
      appointmentId: a.id,
      date: a.startsAt.toISOString().slice(0, 10),
      chiefComplaint: a.chiefComplaint ?? 'Routine visit',
      examination: 'Oral cavity examined; soft tissue normal; no lymphadenopathy noted.',
      assessment: 'Moderate caries on tooth surface; treatment indicated.',
      procedures: 'Prophylaxis performed. Composite filling placed.',
      recommendations: 'Avoid sugary food for 24 hours. Fluoride mouthwash twice daily.',
      notes: null,
      status: 'final' as const,
      createdBy: USER_SBD_ADMIN_ID,
    })),
    ...completedBsm.map((a, i) => ({
      id: `00000000-000f-0002-${String(i).padStart(4, '0')}-000000000001`,
      clinicId: CLINIC_BSM_ID,
      branchId: BRANCH_BSM_MAIN_ID,
      patientId: a.patientId!,
      dentistId: DENTIST_CRUZ_ID,
      appointmentId: a.id,
      date: a.startsAt.toISOString().slice(0, 10),
      chiefComplaint: a.chiefComplaint ?? 'Routine visit',
      examination: 'Full oral examination performed. Perio charting updated.',
      assessment: 'Mild gingivitis; no pocketing greater than 3mm.',
      procedures: 'Scaling and root planing completed.',
      recommendations: 'Improve oral hygiene; use interdental brush.',
      notes: null,
      status: 'final' as const,
      createdBy: USER_BSM_ADMIN_ID,
    })),
  ];

  await db.insert(schema.encounters).values(encounterRows).onConflictDoNothing();

  const treatmentRows = encounterRows.map((enc, i) => ({
    id: `00000000-0010-0001-${String(i).padStart(4, '0')}-000000000001`,
    clinicId: enc.clinicId,
    encounterId: enc.id,
    patientId: enc.patientId,
    serviceId: enc.clinicId === CLINIC_SBD_ID ? SBD_SERVICE_IDS[i % SBD_SERVICE_IDS.length] : BSM_SERVICE_IDS[i % BSM_SERVICE_IDS.length],
    toothRef: TOOTH_NUMBERS[i % TOOTH_NUMBERS.length],
    notes: 'Procedure completed without complications.',
    performedBy: enc.dentistId,
    performedAt: new Date(enc.date + 'T09:00:00+08:00'),
  }));

  await db.insert(schema.treatmentRecords).values(treatmentRows).onConflictDoNothing();

  const odontogramRows = encounterRows.map((enc, i) => ({
    id: `00000000-0011-0001-${String(i).padStart(4, '0')}-000000000001`,
    clinicId: enc.clinicId,
    patientId: enc.patientId,
    dentistId: enc.dentistId,
    encounterId: enc.id,
    toothNumber: TOOTH_NUMBERS[i % TOOTH_NUMBERS.length],
    surfaces: ['O', 'MO', 'DO', 'MOD', 'B', ''][i % 6],
    conditionCode: CONDITION_CODES[i % CONDITION_CODES.length],
    procedureCode: PROCEDURE_CODES[i % PROCEDURE_CODES.length],
    note: 'Recorded during encounter.',
    correctionOf: null,
  }));

  await db.insert(schema.odontogramEvents).values(odontogramRows).onConflictDoNothing();

  // ── 12. Audit events ───────────────────────────────────────────────────────
  console.log('  📝  Audit events...');
  await db.insert(schema.auditEvents).values([
    {
      id: '00000000-0012-0001-0000-000000000001',
      actorId: ADMIN_USER_ID,
      actorEmail: 'admin@toothhub.ph',
      clinicId: null,
      entityType: 'clinic',
      entityId: CLINIC_SBD_ID,
      action: 'clinic.created',
      metadata: JSON.stringify({ name: 'Smile Bright Dental', slug: 'smile-bright-dental' }),
      occurredAt: daysFromNow(-180),
    },
    {
      id: '00000000-0012-0002-0000-000000000001',
      actorId: ADMIN_USER_ID,
      actorEmail: 'admin@toothhub.ph',
      clinicId: null,
      entityType: 'clinic',
      entityId: CLINIC_BSM_ID,
      action: 'clinic.created',
      metadata: JSON.stringify({ name: 'BrightSmile Dental Clinic', slug: 'brightsmile-dental-clinic' }),
      occurredAt: daysFromNow(-14),
    },
    {
      id: '00000000-0012-0003-0000-000000000001',
      actorId: ADMIN_USER_ID,
      actorEmail: 'admin@toothhub.ph',
      clinicId: CLINIC_SBD_ID,
      entityType: 'subscription',
      entityId: SUB_SBD_ID,
      action: 'subscription.assigned',
      metadata: JSON.stringify({ package: 'professional', status: 'active' }),
      occurredAt: daysFromNow(-180),
    },
    {
      id: '00000000-0012-0004-0000-000000000001',
      actorId: ADMIN_USER_ID,
      actorEmail: 'admin@toothhub.ph',
      clinicId: CLINIC_BSM_ID,
      entityType: 'subscription',
      entityId: SUB_BSM_ID,
      action: 'subscription.assigned',
      metadata: JSON.stringify({ package: 'starter', status: 'trial' }),
      occurredAt: daysFromNow(-14),
    },
    ...completedSbd.slice(0, 3).map((a, i) => ({
      id: `00000000-0012-0005-${String(i).padStart(4, '0')}-000000000001`,
      actorId: USER_SBD_RECEP_ID,
      actorEmail: 'reception@smilebrightdental.ph',
      clinicId: CLINIC_SBD_ID,
      entityType: 'appointment',
      entityId: a.id,
      action: 'appointment.status_changed',
      metadata: JSON.stringify({ from: 'confirmed', to: 'completed' }),
      occurredAt: a.completedAt ?? NOW,
    })),
  ]).onConflictDoNothing();

  console.log('\n✅  Seed complete!\n');
  console.log('  Demo accounts:');
  console.log('  ─────────────────────────────────────────────────');
  console.log('  Super Admin  admin@toothhub.ph');
  console.log('  Clinic 1     admin@smilebrightdental.ph  (Professional, Active)');
  console.log('  Clinic 2     admin@brightsmile.ph        (Starter, Trial)');
  console.log('  ─────────────────────────────────────────────────');
  console.log('  Patients: 20 per clinic (40 total)');
  console.log('  Appointments: 15 per clinic (30 total)');
  console.log('  Encounters:' + encounterRows.length + ' | Treatments: ' + treatmentRows.length + ' | Odontogram: ' + odontogramRows.length);
}

seed()
  .catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(() => sql.end());
