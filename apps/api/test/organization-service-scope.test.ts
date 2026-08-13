import { describe, expect, it } from 'vitest';
import type { DB } from '@dentra/db';
import { createOrganizationService, OrganizationError } from '../src/organizations/service.js';

const ORGANIZATION_ID = '77777777-7777-4777-8777-777777777777';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const BRANCH_ID = '88888888-8888-4888-8888-888888888888';
const OTHER_BRANCH_ID = '99999999-9999-4999-8999-999999999999';
const CLINIC_ID = '33333333-3333-4333-8333-333333333333';

function queuedDatabase(results: unknown[][]): DB {
  return { select: () => { const result = results.shift() ?? []; const query: Record<string, unknown> & PromiseLike<unknown> = { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) }; for (const method of ['from', 'innerJoin', 'leftJoin', 'where', 'limit', 'orderBy']) query[method] = () => query; return query; } } as unknown as DB;
}

describe('organization branch scope', () => {
  it('returns only assigned branches to regional managers', async () => {
    const database = queuedDatabase([
      [{ id: 'membership', role: 'regional_manager', branchIds: JSON.stringify([BRANCH_ID]) }],
      [{ id: ORGANIZATION_ID, name: 'Dental Group', slug: 'dental-group', description: null }],
      [{ clinicId: CLINIC_ID, clinicName: 'Clinic A', branchId: BRANCH_ID, branchName: 'Visible', branchActive: true }, { clinicId: CLINIC_ID, clinicName: 'Clinic A', branchId: OTHER_BRANCH_ID, branchName: 'Hidden', branchActive: true }],
    ]);
    const result = await createOrganizationService(database).workspace(ORGANIZATION_ID, USER_ID);
    expect(result.clinics).toHaveLength(1);
    expect(result.clinics[0]?.branchId).toBe(BRANCH_ID);
    expect(result.members).toEqual([]);
  });

  it('rejects branch assignments outside the organization', async () => {
    const database = queuedDatabase([
      [{ id: 'membership', role: 'owner', branchIds: '[]' }],
      [{ id: BRANCH_ID }],
    ]);
    await expect(createOrganizationService(database).upsertMember(ORGANIZATION_ID, { email: 'regional@example.test', role: 'regional_manager', branchIds: [BRANCH_ID, OTHER_BRANCH_ID] }, { id: USER_ID, email: 'owner@example.test' })).rejects.toMatchObject({ code: 'INVALID_BRANCH_SCOPE', statusCode: 400 } satisfies Partial<OrganizationError>);
  });
});
