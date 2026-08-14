import { describe, expect, it } from 'vitest';
import {
  generatedSlots,
  isOnTimeOff,
  resolveBranchRange,
  resolveClosure,
  resolveDentistRange,
  withinDentistRange,
  type BranchHourRow,
  type ClosureRow,
  type DentistScheduleRow,
  type TimeOffRow,
} from '../src/public/booking-service.js';

// 2030-05-10 is a Friday (weekday 5); 2030-05-12 is a Sunday (weekday 0).
const FRIDAY = '2030-05-10';
const SUNDAY = '2030-05-12';
const branchId = 'branch-1';
const otherBranchId = 'branch-2';
const dentistId = 'dentist-1';

describe('resolveBranchRange', () => {
  it('returns the open range for a configured weekday', () => {
    const rows: BranchHourRow[] = [{ weekday: 5, opensAt: 9 * 60, closesAt: 17 * 60, isClosed: false }];
    expect(resolveBranchRange(rows, FRIDAY)).toEqual([540, 1020]);
  });
  it('returns null when the weekday row is marked closed', () => {
    const rows: BranchHourRow[] = [{ weekday: 0, opensAt: null, closesAt: null, isClosed: true }];
    expect(resolveBranchRange(rows, SUNDAY)).toBeNull();
  });
  it('returns null when there is no row for the weekday (treated as closed)', () => {
    const rows: BranchHourRow[] = [{ weekday: 5, opensAt: 540, closesAt: 1020, isClosed: false }];
    expect(resolveBranchRange(rows, SUNDAY)).toBeNull();
  });
  it('returns null when opensAt is not before closesAt', () => {
    const rows: BranchHourRow[] = [{ weekday: 5, opensAt: 1020, closesAt: 540, isClosed: false }];
    expect(resolveBranchRange(rows, FRIDAY)).toBeNull();
  });
});

describe('resolveClosure', () => {
  const rows: ClosureRow[] = [
    { branchId: null, date: FRIDAY, label: 'Independence Day', isEnabled: true },
    { branchId, date: SUNDAY, label: 'Branch renovation', isEnabled: true },
    { branchId: otherBranchId, date: FRIDAY, label: 'Other branch only', isEnabled: true },
  ];
  it('applies a clinic-wide closure to every branch', () => {
    expect(resolveClosure(rows, branchId, FRIDAY)).toBe('Independence Day');
    expect(resolveClosure(rows, otherBranchId, FRIDAY)).toBe('Other branch only');
  });
  it('applies a branch-specific closure only to that branch', () => {
    expect(resolveClosure(rows, branchId, SUNDAY)).toBe('Branch renovation');
    expect(resolveClosure(rows, otherBranchId, SUNDAY)).toBeNull();
  });
  it('ignores a disabled closure (clinic chose to stay open)', () => {
    const disabled: ClosureRow[] = [{ branchId: null, date: FRIDAY, label: 'Special day', isEnabled: false }];
    expect(resolveClosure(disabled, branchId, FRIDAY)).toBeNull();
  });
  it('prefers a branch-specific row over a clinic-wide row for the same date', () => {
    const both: ClosureRow[] = [
      { branchId: null, date: FRIDAY, label: 'Clinic-wide', isEnabled: true },
      { branchId, date: FRIDAY, label: 'This branch only', isEnabled: true },
    ];
    expect(resolveClosure(both, branchId, FRIDAY)).toBe('This branch only');
  });
});

describe('resolveDentistRange', () => {
  const branchRange: [number, number] = [540, 1020]; // 9am-5pm
  it('is unrestricted when the dentist has no configured schedule rows at this branch', () => {
    expect(resolveDentistRange([], dentistId, branchId, FRIDAY, branchRange)).toEqual(branchRange);
  });
  it('returns null for a weekday the dentist has not configured, once at least one row exists', () => {
    // Only Monday (weekday 1) configured — Friday (weekday 5) should be "not working".
    const configured: DentistScheduleRow[] = [{ dentistId, branchId, weekday: 1, startsAt: 540, endsAt: 720 }];
    expect(resolveDentistRange(configured, dentistId, branchId, FRIDAY, branchRange)).toBeNull();
  });
  it('clamps a configured range to the branch\'s own open hours', () => {
    const rows: DentistScheduleRow[] = [{ dentistId, branchId, weekday: 5, startsAt: 480, endsAt: 1080 }]; // 8am-6pm, wider than branch
    expect(resolveDentistRange(rows, dentistId, branchId, FRIDAY, branchRange)).toEqual([540, 1020]);
  });
  it('returns a narrower configured range unmodified when inside branch hours', () => {
    const rows: DentistScheduleRow[] = [{ dentistId, branchId, weekday: 5, startsAt: 600, endsAt: 720 }]; // 10am-12pm
    expect(resolveDentistRange(rows, dentistId, branchId, FRIDAY, branchRange)).toEqual([600, 720]);
  });
  it('ignores schedule rows configured for a different branch', () => {
    const rows: DentistScheduleRow[] = [{ dentistId, branchId: otherBranchId, weekday: 5, startsAt: 600, endsAt: 720 }];
    expect(resolveDentistRange(rows, dentistId, branchId, FRIDAY, branchRange)).toEqual(branchRange);
  });
});

describe('isOnTimeOff', () => {
  const rows: TimeOffRow[] = [{ dentistId, startDate: '2030-05-09', endDate: '2030-05-11' }];
  it('is true for a date inside the (inclusive) range', () => {
    expect(isOnTimeOff(rows, dentistId, FRIDAY)).toBe(true);
    expect(isOnTimeOff(rows, dentistId, '2030-05-09')).toBe(true);
    expect(isOnTimeOff(rows, dentistId, '2030-05-11')).toBe(true);
  });
  it('is false for a date outside the range', () => {
    expect(isOnTimeOff(rows, dentistId, SUNDAY)).toBe(false);
  });
  it('is false for a different dentist', () => {
    expect(isOnTimeOff(rows, 'someone-else', FRIDAY)).toBe(false);
  });
});

describe('generatedSlots', () => {
  it('returns no slots when hours are null (closed)', () => {
    expect(generatedSlots(null, FRIDAY, 30)).toEqual([]);
  });
  it('generates 30-minute-stepped slots within the range for a future date', () => {
    const slots = generatedSlots([9 * 60, 10 * 60], FRIDAY, 30);
    expect(slots.map((s) => s.startsAt)).toEqual(['2030-05-10T01:00:00.000Z', '2030-05-10T01:30:00.000Z']);
  });
});

describe('withinDentistRange', () => {
  it('is false when the dentist has no range for the date', () => {
    const slot = generatedSlots([9 * 60, 10 * 60], FRIDAY, 30)[0];
    expect(withinDentistRange(slot, FRIDAY, null)).toBe(false);
  });
  it('is true when the slot fits inside the dentist\'s range', () => {
    const slot = generatedSlots([9 * 60, 10 * 60], FRIDAY, 30)[0];
    expect(withinDentistRange(slot, FRIDAY, [540, 1020])).toBe(true);
  });
  it('is false when the slot falls outside a narrower dentist range', () => {
    const slot = generatedSlots([9 * 60, 10 * 60], FRIDAY, 30)[0];
    expect(withinDentistRange(slot, FRIDAY, [600, 720])).toBe(false);
  });
});
