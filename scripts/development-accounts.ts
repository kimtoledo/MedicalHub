export const MIN_DEVELOPMENT_PASSWORD_LENGTH = 10;

export const DEVELOPMENT_ACCOUNT_EMAILS = [
  'admin@dentra.ph',
  'admin@smilebrightdental.ph',
  'reception@smilebrightdental.ph',
  'assistant@smilebrightdental.ph',
  'admin@brightsmile.ph',
  'reception@brightsmile.ph',
  'assistant@brightsmile.ph',
  'dr.reyes@smilebrightdental.ph',
] as const;

export type DevelopmentPasswords = {
  superAdmin: string;
  clinicStaff: string;
};

export type DevelopmentUser = {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  platformRole?: 'super_admin';
};

export type DevelopmentCredential = {
  id: string;
  accountId: string;
  providerId: 'credential';
  userId: string;
  password: string;
};

export type DevelopmentMembership = {
  id: string;
  userId: string;
  clinicId: string;
  branchId: string;
  role: 'clinic_admin' | 'receptionist' | 'dental_assistant' | 'dentist';
  dentistId?: string;
};

export interface DevelopmentAccountStore {
  upsertUsers(users: DevelopmentUser[]): Promise<void>;
  upsertCredentials(credentials: DevelopmentCredential[]): Promise<void>;
  upsertMemberships(memberships: DevelopmentMembership[]): Promise<void>;
}

const CLINIC_SBD_ID = '00000000-0003-0000-0000-000000000001';
const CLINIC_BSM_ID = '00000000-0003-0000-0000-000000000002';
const BRANCH_SBD_MAIN_ID = '00000000-0004-0000-0000-000000000001';
const BRANCH_BSM_MAIN_ID = '00000000-0004-0000-0000-000000000003';
const DENTIST_REYES_ID = '00000000-0005-0000-0000-000000000001';

const users: DevelopmentUser[] = [
  { id: '00000000-0001-0000-0000-000000000001', name: 'Dentra Admin', email: DEVELOPMENT_ACCOUNT_EMAILS[0], firstName: 'Dentra', lastName: 'Admin', phone: '09171234567', platformRole: 'super_admin' },
  { id: '00000000-0006-0000-0000-000000000001', name: 'Rosario Villanueva', email: DEVELOPMENT_ACCOUNT_EMAILS[1], firstName: 'Rosario', lastName: 'Villanueva', phone: '09171112222' },
  { id: '00000000-0006-0000-0000-000000000002', name: 'Lourdes Aquino', email: DEVELOPMENT_ACCOUNT_EMAILS[2], firstName: 'Lourdes', lastName: 'Aquino', phone: '09172223333' },
  { id: '00000000-0006-0000-0000-000000000003', name: 'Maribel Castillo', email: DEVELOPMENT_ACCOUNT_EMAILS[3], firstName: 'Maribel', lastName: 'Castillo', phone: '09173334444' },
  { id: '00000000-0006-0000-0000-000000000004', name: 'Gina Pascual', email: DEVELOPMENT_ACCOUNT_EMAILS[4], firstName: 'Gina', lastName: 'Pascual', phone: '09174445555' },
  { id: '00000000-0006-0000-0000-000000000005', name: 'Cynthia Manalo', email: DEVELOPMENT_ACCOUNT_EMAILS[5], firstName: 'Cynthia', lastName: 'Manalo', phone: '09175556666' },
  { id: '00000000-0006-0000-0000-000000000006', name: 'Josefina Abad', email: DEVELOPMENT_ACCOUNT_EMAILS[6], firstName: 'Josefina', lastName: 'Abad', phone: '09176667777' },
  { id: '00000000-0006-0000-0000-000000000007', name: 'Dr. Maria Reyes', email: DEVELOPMENT_ACCOUNT_EMAILS[7], firstName: 'Maria', lastName: 'Reyes', phone: '09181234567' },
];

const memberships: DevelopmentMembership[] = [
  { id: '00000000-000b-0001-0000-000000000001', userId: users[1].id, clinicId: CLINIC_SBD_ID, branchId: BRANCH_SBD_MAIN_ID, role: 'clinic_admin' },
  { id: '00000000-000b-0002-0000-000000000001', userId: users[2].id, clinicId: CLINIC_SBD_ID, branchId: BRANCH_SBD_MAIN_ID, role: 'receptionist' },
  { id: '00000000-000b-0003-0000-000000000001', userId: users[3].id, clinicId: CLINIC_SBD_ID, branchId: BRANCH_SBD_MAIN_ID, role: 'dental_assistant' },
  { id: '00000000-000b-0004-0000-000000000001', userId: users[4].id, clinicId: CLINIC_BSM_ID, branchId: BRANCH_BSM_MAIN_ID, role: 'clinic_admin' },
  { id: '00000000-000b-0005-0000-000000000001', userId: users[5].id, clinicId: CLINIC_BSM_ID, branchId: BRANCH_BSM_MAIN_ID, role: 'receptionist' },
  { id: '00000000-000b-0006-0000-000000000001', userId: users[6].id, clinicId: CLINIC_BSM_ID, branchId: BRANCH_BSM_MAIN_ID, role: 'dental_assistant' },
  { id: '00000000-000b-0007-0000-000000000001', userId: users[7].id, clinicId: CLINIC_SBD_ID, branchId: BRANCH_SBD_MAIN_ID, role: 'dentist', dentistId: DENTIST_REYES_ID },
];

export function readDevelopmentPasswords(env: NodeJS.ProcessEnv): DevelopmentPasswords {
  const required = [
    ['DEV_SUPER_ADMIN_PASSWORD', env.DEV_SUPER_ADMIN_PASSWORD],
    ['DEV_CLINIC_PASSWORD', env.DEV_CLINIC_PASSWORD],
  ] as const;
  const invalid = required.filter(([, value]) => !value || value.length < MIN_DEVELOPMENT_PASSWORD_LENGTH);
  if (invalid.length > 0) {
    throw new Error(
      `${invalid.map(([name]) => name).join(' and ')} must be set to at least ${MIN_DEVELOPMENT_PASSWORD_LENGTH} characters in a git-ignored .env file or Replit Secrets before seeding.`,
    );
  }
  return { superAdmin: required[0][1]!, clinicStaff: required[1][1]! };
}

export async function seedDevelopmentAccounts(
  store: DevelopmentAccountStore,
  passwords: DevelopmentPasswords,
  hash: (password: string) => Promise<string>,
): Promise<void> {
  const [superAdminHash, clinicHash] = await Promise.all([
    hash(passwords.superAdmin),
    hash(passwords.clinicStaff),
  ]);
  const credentials = users.map((user, index): DevelopmentCredential => ({
    id: `00000000-0013-0000-0000-${String(index + 1).padStart(12, '0')}`,
    accountId: user.id,
    providerId: 'credential',
    userId: user.id,
    password: index === 0 ? superAdminHash : clinicHash,
  }));
  await store.upsertUsers(users);
  await store.upsertCredentials(credentials);
  await store.upsertMemberships(memberships);
}