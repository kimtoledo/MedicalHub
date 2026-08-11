import { describe, expect, it } from 'vitest';
import { getClinicAccess, hasClinicAccess, isSuperAdmin } from '../src/auth/authorization.js';
import type { AuthorizationContext } from '../src/auth/types.js';

const context: AuthorizationContext = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'dentist@example.test',
    name: 'Demo Dentist',
    platformRole: null,
  },
  strategies: ['clinicMember'],
  clinicMemberships: [
    {
      clinicId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      branchId: null,
      role: 'dentist',
      dentistId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    },
  ],
};

describe('authorization guards', () => {
  it('does not grant platform access to a clinic member', () => {
    expect(isSuperAdmin(context)).toBe(false);
  });

  it('allows only memberships for the requested tenant', () => {
    expect(hasClinicAccess(context, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toBe(true);
    expect(hasClinicAccess(context, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')).toBe(false);
    expect(getClinicAccess(context, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')).toEqual([]);
  });

  it('enforces allowed clinic roles', () => {
    expect(
      hasClinicAccess(context, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ['dentist']),
    ).toBe(true);
    expect(
      hasClinicAccess(context, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', [
        'clinic_owner',
      ]),
    ).toBe(false);
  });
});
