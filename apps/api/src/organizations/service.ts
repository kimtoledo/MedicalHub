import { and, count, countDistinct, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { appointments, branches, clinicMemberships, clinics, invoices, organizationClinics, organizationMemberships, organizations, patients, users } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';

export type OrganizationService = ReturnType<typeof createOrganizationService>;
export type OrganizationRole = 'owner' | 'admin' | 'regional_manager' | 'viewer';
export class OrganizationError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
type Actor = { id: string; email: string; ipAddress?: string; userAgent?: string };

function parseBranchIds(value: string): string[] {
  try { const parsed = JSON.parse(value) as unknown; return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : []; } catch { return []; }
}

export function createOrganizationService(database: DB) {
  const member = async (organizationId: string, userId: string) => {
    const [row] = await database.select({ id: organizationMemberships.id, role: organizationMemberships.role, branchIds: organizationMemberships.branchIds }).from(organizationMemberships).where(and(eq(organizationMemberships.organizationId, organizationId), eq(organizationMemberships.userId, userId))).limit(1);
    return row ? { ...row, branchIds: parseBranchIds(row.branchIds) } : null;
  };

  const assertBranches = async (organizationId: string, branchIds: string[]) => {
    if (!branchIds.length) return;
    const rows = await database.select({ id: branches.id }).from(branches).innerJoin(organizationClinics, and(eq(organizationClinics.clinicId, branches.clinicId), eq(organizationClinics.organizationId, organizationId))).where(and(inArray(branches.id, branchIds), isNull(branches.deletedAt)));
    if (new Set(rows.map((row) => row.id)).size !== new Set(branchIds).size) throw new OrganizationError('INVALID_BRANCH_SCOPE', 'Every assigned branch must belong to the organization', 400);
  };

  return {
    create: async (input: { name: string; slug: string; clinicId: string }, actor: Actor) => database.transaction(async (tx) => {
      const [organization] = await tx.insert(organizations).values({ name: input.name, slug: input.slug }).returning({ id: organizations.id });
      await tx.insert(organizationClinics).values({ organizationId: organization.id, clinicId: input.clinicId });
      await tx.insert(organizationMemberships).values({ organizationId: organization.id, userId: actor.id, role: 'owner', branchIds: '[]' });
      await writeAudit(tx as unknown as DB, { actorId: actor.id, actorEmail: actor.email, clinicId: input.clinicId, entityType: 'organization', entityId: organization.id, action: AuditAction.ORGANIZATION_CREATED, metadata: JSON.stringify({ clinicId: input.clinicId }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return organization;
    }),

    eligibleClinics: async (userId: string) => database.select({ id: clinics.id, name: clinics.name, slug: clinics.slug }).from(clinicMemberships).innerJoin(clinics, eq(clinicMemberships.clinicId, clinics.id)).where(and(eq(clinicMemberships.userId, userId), inArray(clinicMemberships.role, ['clinic_owner', 'clinic_admin']), eq(clinicMemberships.isActive, 'true'), isNull(clinics.deletedAt))).groupBy(clinics.id),

    attachClinic: async (organizationId: string, clinicId: string, actor: Actor) => {
      const [access, clinicAccess] = await Promise.all([
        member(organizationId, actor.id),
        database.select({ id: clinicMemberships.id }).from(clinicMemberships).where(and(eq(clinicMemberships.userId, actor.id), eq(clinicMemberships.clinicId, clinicId), inArray(clinicMemberships.role, ['clinic_owner', 'clinic_admin']), eq(clinicMemberships.isActive, 'true'))).limit(1),
      ]);
      if (!access || !['owner', 'admin'].includes(access.role)) throw new OrganizationError('FORBIDDEN', 'Organization administrator access is required', 403);
      if (!clinicAccess[0]) throw new OrganizationError('CLINIC_ACCESS_REQUIRED', 'You must be an owner or administrator of the clinic being attached', 403);
      const [otherOrganization] = await database.select({ organizationId: organizationClinics.organizationId }).from(organizationClinics).where(eq(organizationClinics.clinicId, clinicId)).limit(1);
      if (otherOrganization && otherOrganization.organizationId !== organizationId) throw new OrganizationError('CLINIC_ALREADY_ATTACHED', 'This clinic belongs to another organization', 409);
      const [created] = await database.insert(organizationClinics).values({ organizationId, clinicId }).onConflictDoNothing().returning({ id: organizationClinics.id });
      if (created) await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'organization_clinic', entityId: created.id, action: AuditAction.ORGANIZATION_CLINIC_ATTACHED, metadata: JSON.stringify({ organizationId }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return created ?? { id: 'already-attached' };
    },

    listMine: async (userId: string) => database.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, role: organizationMemberships.role }).from(organizationMemberships).innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id)).where(eq(organizationMemberships.userId, userId)),

    workspace: async (organizationId: string, userId: string) => {
      const access = await member(organizationId, userId);
      if (!access) throw new OrganizationError('FORBIDDEN', 'Organization access is required', 403);
      const [organization] = await database.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, description: organizations.description }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
      if (!organization) throw new OrganizationError('NOT_FOUND', 'Organization not found', 404);
      const clinicRows = await database.select({ clinicId: clinics.id, clinicName: clinics.name, branchId: branches.id, branchName: branches.name, branchActive: branches.isActive }).from(organizationClinics).innerJoin(clinics, eq(organizationClinics.clinicId, clinics.id)).leftJoin(branches, and(eq(branches.clinicId, clinics.id), isNull(branches.deletedAt))).where(eq(organizationClinics.organizationId, organizationId));
      const visibleRows = access.role === 'regional_manager' ? clinicRows.filter((row) => row.branchId && access.branchIds.includes(row.branchId)) : clinicRows;
      const memberRows = ['owner', 'admin'].includes(access.role) ? await database.select({ id: organizationMemberships.id, userId: users.id, name: users.name, email: users.email, role: organizationMemberships.role, branchIds: organizationMemberships.branchIds }).from(organizationMemberships).innerJoin(users, eq(organizationMemberships.userId, users.id)).where(eq(organizationMemberships.organizationId, organizationId)) : [];
      return { organization, access, clinics: visibleRows, members: memberRows.map((row) => ({ ...row, branchIds: parseBranchIds(row.branchIds) })) };
    },

    report: async (organizationId: string, userId: string) => {
      const access = await member(organizationId, userId);
      if (!access) throw new OrganizationError('FORBIDDEN', 'Organization access is required', 403);
      const branchRows = await database.select({ id: branches.id, clinicId: branches.clinicId }).from(branches).innerJoin(organizationClinics, and(eq(organizationClinics.clinicId, branches.clinicId), eq(organizationClinics.organizationId, organizationId))).where(isNull(branches.deletedAt));
      const visibleBranches = access.role === 'regional_manager' ? branchRows.filter((row) => access.branchIds.includes(row.id)) : branchRows;
      const branchIds = visibleBranches.map((row) => row.id);
      const clinicIds = [...new Set(visibleBranches.map((row) => row.clinicId))];
      if (!branchIds.length) return { clinicCount: 0, branchCount: 0, appointments: 0, patients: 0, revenuePhp: '0', scope: access.role === 'regional_manager' ? 'assigned_branches' : 'organization' };
      const patientQuery = access.role === 'regional_manager'
        ? database.select({ count: countDistinct(appointments.patientId) }).from(appointments).where(inArray(appointments.branchId, branchIds))
        : database.select({ count: count(patients.id) }).from(patients).where(inArray(patients.clinicId, clinicIds));
      const [[appointmentTotal], [patientTotal], [revenue]] = await Promise.all([
        database.select({ count: count(appointments.id) }).from(appointments).where(inArray(appointments.branchId, branchIds)),
        patientQuery,
        database.select({ total: sql<string>`coalesce(sum(${invoices.totalAmountPhp}), 0)::numeric` }).from(invoices).where(inArray(invoices.branchId, branchIds)),
      ]);
      return { clinicCount: clinicIds.length, branchCount: branchIds.length, appointments: Number(appointmentTotal?.count ?? 0), patients: Number(patientTotal?.count ?? 0), revenuePhp: revenue?.total ?? '0', scope: access.role === 'regional_manager' ? 'assigned_branches' : 'organization' };
    },

    upsertMember: async (organizationId: string, input: { email: string; role: OrganizationRole; branchIds: string[] }, actor: Actor) => {
      const access = await member(organizationId, actor.id);
      if (!access || !['owner', 'admin'].includes(access.role)) throw new OrganizationError('FORBIDDEN', 'Organization administrator access is required', 403);
      if (input.role === 'owner' && access.role !== 'owner') throw new OrganizationError('OWNER_REQUIRED', 'Only an organization owner can assign another owner', 403);
      if (input.role === 'regional_manager' && !input.branchIds.length) throw new OrganizationError('BRANCH_SCOPE_REQUIRED', 'Regional managers require at least one branch', 400);
      await assertBranches(organizationId, input.branchIds);
      const [target] = await database.select({ id: users.id }).from(users).where(and(eq(users.email, input.email.toLowerCase()), eq(users.isActive, 'true'), isNull(users.deletedAt))).limit(1);
      if (!target) throw new OrganizationError('USER_NOT_FOUND', 'No active Dentra account uses that email', 404);
      const [existing] = await database.select({ id: organizationMemberships.id, role: organizationMemberships.role }).from(organizationMemberships).where(and(eq(organizationMemberships.organizationId, organizationId), eq(organizationMemberships.userId, target.id))).limit(1);
      if (existing?.role === 'owner' && access.role !== 'owner') throw new OrganizationError('OWNER_REQUIRED', 'Only an organization owner can change an owner', 403);
      if (existing?.role === 'owner' && input.role !== 'owner') {
        const [ownerTotal] = await database.select({ count: count(organizationMemberships.id) }).from(organizationMemberships).where(and(eq(organizationMemberships.organizationId, organizationId), eq(organizationMemberships.role, 'owner')));
        if (Number(ownerTotal?.count ?? 0) <= 1) throw new OrganizationError('LAST_OWNER', 'Assign another owner before changing the last owner', 409);
      }
      const branchIds = input.role === 'regional_manager' ? input.branchIds : [];
      const [saved] = existing
        ? await database.update(organizationMemberships).set({ role: input.role, branchIds: JSON.stringify(branchIds), updatedAt: new Date() }).where(eq(organizationMemberships.id, existing.id)).returning({ id: organizationMemberships.id })
        : await database.insert(organizationMemberships).values({ organizationId, userId: target.id, role: input.role, branchIds: JSON.stringify(branchIds) }).returning({ id: organizationMemberships.id });
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId: null, entityType: 'organization_membership', entityId: saved.id, action: AuditAction.ORGANIZATION_MEMBER_UPDATED, metadata: JSON.stringify({ organizationId, userId: target.id, role: input.role, branchIds }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return saved;
    },
  };
}
