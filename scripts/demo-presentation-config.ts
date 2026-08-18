export const DEMO_IDS = {
  adminUser: '00000000-0001-0000-0000-000000000001',
  clinic: '00000000-0003-0000-0000-000000000001',
  branch: '00000000-0004-0000-0000-000000000001',
  dentist: '00000000-0005-0000-0000-000000000001',
  verificationCandidate: '00000000-0005-0000-0000-000000000004',
  dentistUser: '00000000-0006-0000-0000-000000000007',
  dentistMembership: '00000000-000b-0007-0000-000000000001',
  subscription: '00000000-0007-0000-0000-000000000001',
  cleaningService: '00000000-000c-0001-0000-000000000001',
  bracesService: '00000000-0031-0000-0000-000000000003',
} as const;

export const PRESENTATION_STATUSES = ['completed', 'in_progress', 'checked_in', 'confirmed'] as const;
export type PresentationStatus = typeof PRESENTATION_STATUSES[number];

export function manilaDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function presentationDate(): string {
  const value = process.env.DEMO_DATE?.trim() || manilaDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00+08:00`).getTime())) {
    throw new Error('DEMO_DATE must be a valid YYYY-MM-DD date');
  }
  return value;
}

export function presentationScenario(): number {
  const value = Number(process.env.DEMO_SCENARIO ?? '1');
  if (!Number.isInteger(value) || value < 1 || value > 9) {
    throw new Error('DEMO_SCENARIO must be an integer from 1 to 9');
  }
  return value;
}

export function scenarioIds(scenario: number) {
  const scenarioPart = String(scenario).padStart(4, '0');
  return {
    patients: PRESENTATION_STATUSES.map((_, index) => `00000000-0031-${scenarioPart}-${String(index + 1).padStart(4, '0')}-000000000001`),
    appointments: PRESENTATION_STATUSES.map((_, index) => `00000000-0031-${scenarioPart}-${String(index + 1).padStart(4, '0')}-000000000002`),
    histories: PRESENTATION_STATUSES.map((_, index) => `00000000-0031-${scenarioPart}-${String(index + 1).padStart(4, '0')}-000000000004`),
  };
}

export function atManilaTime(date: string, hour: number, minute = 0): Date {
  return new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`);
}

export function weekdayInManila(date: string): number {
  return new Date(`${date}T12:00:00+08:00`).getUTCDay();
}
