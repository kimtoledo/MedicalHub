import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import {
  dentists,
  patients,
  services,
  treatmentPlanItems,
  treatmentPlans,
  treatmentRecords,
} from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';
import type { PatientActor } from './patients-service.js';

export type TreatmentPlanItemInput = {
  serviceId: string;
  toothRef?: string;
  area?: string;
  estimatedFeePhp: string;
  priority: 'low' | 'medium' | 'high';
  sequence: number;
  notes?: string;
};

export type TreatmentPlanInput = {
  title: string;
  notes?: string;
  items: TreatmentPlanItemInput[];
};

export type TreatmentPlanStatus = 'draft' | 'approved' | 'archived';
export type TreatmentPlanItemStatus =
  | 'proposed'
  | 'accepted'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TreatmentPlanItemView = {
  id: string;
  serviceId: string | null;
  serviceName: string | null;
  toothRef: string | null;
  area: string | null;
  estimatedFeePhp: string;
  priority: string;
  sequence: number;
  status: TreatmentPlanItemStatus;
  treatmentRecordId: string | null;
  completedAt: Date | null;
  notes: string | null;
};

export type TreatmentPlanView = {
  id: string;
  patientId: string;
  dentistId: string | null;
  dentistName: string | null;
  title: string;
  notes: string | null;
  status: TreatmentPlanStatus;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: TreatmentPlanItemView[];
};

export type ClinicTreatmentPlansService = {
  listForPatient: (clinicId: string, patientId: string) => Promise<TreatmentPlanView[] | null>;
  get: (clinicId: string, planId: string) => Promise<TreatmentPlanView | null>;
  create: (
    clinicId: string,
    patientId: string,
    dentistId: string,
    input: TreatmentPlanInput,
    actor: PatientActor,
  ) => Promise<{ id: string }>;
  updatePlan: (
    clinicId: string,
    planId: string,
    dentistId: string | null,
    input: { title?: string; notes?: string; status?: TreatmentPlanStatus },
    actor: PatientActor,
  ) => Promise<{ id: string; status: TreatmentPlanStatus }>;
  updateItemStatus: (
    clinicId: string,
    planId: string,
    itemId: string,
    dentistId: string | null,
    input: { status: TreatmentPlanItemStatus; treatmentRecordId?: string },
    actor: PatientActor,
  ) => Promise<{ id: string; status: TreatmentPlanItemStatus }>;
};

export class ClinicTreatmentPlanError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

const allowedItemTransitions: Record<
  TreatmentPlanItemStatus,
  TreatmentPlanItemStatus[]
> = {
  proposed: ['accepted', 'cancelled'],
  accepted: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function isPlanStatus(value: string): value is TreatmentPlanStatus {
  return value === 'draft' || value === 'approved' || value === 'archived';
}

function isItemStatus(value: string): value is TreatmentPlanItemStatus {
  return Object.hasOwn(allowedItemTransitions, value);
}

export function createClinicTreatmentPlansService(
  database: DB,
): ClinicTreatmentPlansService {
  const ensurePatient = async (clinicId: string, patientId: string) => {
    const [patient] = await database
      .select({ id: patients.id })
      .from(patients)
      .where(
        and(
          eq(patients.id, patientId),
          eq(patients.clinicId, clinicId),
          isNull(patients.deletedAt),
        ),
      )
      .limit(1);
    if (!patient) {
      throw new ClinicTreatmentPlanError('PATIENT_NOT_FOUND', 'Patient not found', 404);
    }
  };

  const hydrate = async (clinicId: string, planRows: Array<{
    id: string;
    patientId: string;
    dentistId: string | null;
    dentistFirstName: string | null;
    dentistLastName: string | null;
    title: string;
    notes: string | null;
    status: string;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>): Promise<TreatmentPlanView[]> => {
    if (planRows.length === 0) return [];
    const planIds = planRows.map((plan) => plan.id);
    const itemRows = await database
      .select({
        id: treatmentPlanItems.id,
        planId: treatmentPlanItems.planId,
        serviceId: treatmentPlanItems.serviceId,
        serviceName: services.name,
        toothRef: treatmentPlanItems.toothRef,
        area: treatmentPlanItems.area,
        estimatedFeePhp: treatmentPlanItems.estimatedFeePhp,
        priority: treatmentPlanItems.priority,
        sequence: treatmentPlanItems.sequence,
        status: treatmentPlanItems.status,
        treatmentRecordId: treatmentPlanItems.treatmentRecordId,
        completedAt: treatmentPlanItems.completedAt,
        notes: treatmentPlanItems.notes,
      })
      .from(treatmentPlanItems)
      .leftJoin(services, eq(treatmentPlanItems.serviceId, services.id))
      .where(
        and(
          eq(treatmentPlanItems.clinicId, clinicId),
          inArray(treatmentPlanItems.planId, planIds),
        ),
      )
      .orderBy(asc(treatmentPlanItems.sequence), asc(treatmentPlanItems.createdAt));
    const itemsByPlan = new Map<string, TreatmentPlanItemView[]>();
    itemRows.forEach((item) => {
      const items = itemsByPlan.get(item.planId) ?? [];
      items.push({
        ...item,
        estimatedFeePhp: item.estimatedFeePhp ?? '0',
        status: item.status as TreatmentPlanItemStatus,
      });
      itemsByPlan.set(item.planId, items);
    });
    return planRows.map((plan) => ({
      id: plan.id,
      patientId: plan.patientId,
      dentistId: plan.dentistId,
      dentistName: [plan.dentistFirstName, plan.dentistLastName]
        .filter(Boolean)
        .join(' ') || null,
      title: plan.title,
      notes: plan.notes,
      status: isPlanStatus(plan.status) ? plan.status : 'draft',
      approvedAt: plan.approvedAt,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      items: itemsByPlan.get(plan.id) ?? [],
    }));
  };

  const selectPlans = () => database
    .select({
      id: treatmentPlans.id,
      patientId: treatmentPlans.patientId,
      dentistId: treatmentPlans.dentistId,
      dentistFirstName: dentists.firstName,
      dentistLastName: dentists.lastName,
      title: treatmentPlans.title,
      notes: treatmentPlans.notes,
      status: treatmentPlans.status,
      approvedAt: treatmentPlans.approvedAt,
      createdAt: treatmentPlans.createdAt,
      updatedAt: treatmentPlans.updatedAt,
    })
    .from(treatmentPlans)
    .leftJoin(dentists, eq(treatmentPlans.dentistId, dentists.id));

  return {
    listForPatient: async (clinicId, patientId) => {
      try {
        await ensurePatient(clinicId, patientId);
      } catch (error) {
        if (error instanceof ClinicTreatmentPlanError && error.code === 'PATIENT_NOT_FOUND') {
          return null;
        }
        throw error;
      }
      const plans = await selectPlans()
        .where(
          and(
            eq(treatmentPlans.clinicId, clinicId),
            eq(treatmentPlans.patientId, patientId),
          ),
        )
        .orderBy(desc(treatmentPlans.updatedAt), desc(treatmentPlans.createdAt));
      return hydrate(clinicId, plans);
    },

    get: async (clinicId, planId) => {
      const plans = await selectPlans()
        .where(
          and(eq(treatmentPlans.id, planId), eq(treatmentPlans.clinicId, clinicId)),
        )
        .limit(1);
      const [plan] = await hydrate(clinicId, plans);
      return plan ?? null;
    },

    create: async (clinicId, patientId, dentistId, input, actor) => {
      await ensurePatient(clinicId, patientId);
      const serviceIds = [...new Set(input.items.map((item) => item.serviceId))];
      const availableServices = await database
        .select({ id: services.id })
        .from(services)
        .where(
          and(
            eq(services.clinicId, clinicId),
            eq(services.isActive, 'true'),
            inArray(services.id, serviceIds),
          ),
        );
      if (availableServices.length !== serviceIds.length) {
        throw new ClinicTreatmentPlanError(
          'SERVICE_UNAVAILABLE',
          'One or more selected services are unavailable',
          404,
        );
      }
      return database.transaction(async (transaction) => {
        const [plan] = await transaction
          .insert(treatmentPlans)
          .values({
            clinicId,
            patientId,
            dentistId,
            title: input.title,
            notes: input.notes || null,
            createdBy: actor.id,
          })
          .returning({ id: treatmentPlans.id });
        await transaction.insert(treatmentPlanItems).values(
          input.items.map((item) => ({
            planId: plan.id,
            clinicId,
            patientId,
            serviceId: item.serviceId,
            toothRef: item.toothRef || null,
            area: item.area || null,
            estimatedFeePhp: item.estimatedFeePhp,
            priority: item.priority,
            sequence: item.sequence,
            notes: item.notes || null,
          })),
        );
        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId,
          entityType: 'treatment_plan',
          entityId: plan.id,
          action: AuditAction.TREATMENT_PLAN_CREATED,
          metadata: JSON.stringify({ patientId, dentistId, itemCount: input.items.length }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
        return plan;
      });
    },

    updatePlan: async (clinicId, planId, dentistId, input, actor) =>
      database.transaction(async (transaction) => {
        const [plan] = await transaction
          .select({
            id: treatmentPlans.id,
            dentistId: treatmentPlans.dentistId,
            status: treatmentPlans.status,
            patientId: treatmentPlans.patientId,
          })
          .from(treatmentPlans)
          .where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.clinicId, clinicId)))
          .limit(1)
          .for('update');
        if (!plan) throw new ClinicTreatmentPlanError('PLAN_NOT_FOUND', 'Treatment plan not found', 404);
        if (dentistId && plan.dentistId !== dentistId) throw new ClinicTreatmentPlanError('FORBIDDEN', 'Only the plan dentist can update this treatment plan', 403);
        if (plan.status === 'archived') throw new ClinicTreatmentPlanError('PLAN_ARCHIVED', 'Archived treatment plans are read-only', 409);
        if (plan.status === 'approved' && (input.title !== undefined || input.notes !== undefined)) {
          throw new ClinicTreatmentPlanError('PLAN_APPROVED', 'Approved treatment plans cannot be edited', 409);
        }
        if (input.status === 'draft' && plan.status !== 'draft') {
          throw new ClinicTreatmentPlanError('INVALID_PLAN_STATUS', 'Approved treatment plans cannot be reverted to draft', 409);
        }
        if (input.status === 'approved' && plan.status !== 'draft') throw new ClinicTreatmentPlanError('INVALID_PLAN_STATUS', 'Only draft treatment plans can be approved', 409);
        if (input.status === 'archived' && plan.status !== 'approved') throw new ClinicTreatmentPlanError('INVALID_PLAN_STATUS', 'Only approved treatment plans can be archived', 409);
        const nextStatus = input.status ?? (plan.status as TreatmentPlanStatus);
        const [updated] = await transaction
          .update(treatmentPlans)
          .set({
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
            status: nextStatus,
            ...(input.status === 'approved'
              ? { approvedAt: new Date(), approvedBy: actor.id }
              : {}),
          })
          .where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.clinicId, clinicId)))
          .returning({ id: treatmentPlans.id, status: treatmentPlans.status });
        const action = input.status
          ? AuditAction.TREATMENT_PLAN_STATUS_CHANGED
          : AuditAction.TREATMENT_PLAN_UPDATED;
        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId,
          entityType: 'treatment_plan',
          entityId: planId,
          action,
          metadata: JSON.stringify({
            patientId: plan.patientId,
            ...(input.status ? { fromStatus: plan.status, toStatus: nextStatus } : { fields: Object.keys(input) }),
          }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
        return { id: updated.id, status: updated.status as TreatmentPlanStatus };
      }),

    updateItemStatus: async (clinicId, planId, itemId, dentistId, input, actor) =>
      database.transaction(async (transaction) => {
        const [plan] = await transaction
          .select({
            id: treatmentPlans.id,
            dentistId: treatmentPlans.dentistId,
            patientId: treatmentPlans.patientId,
            status: treatmentPlans.status,
          })
          .from(treatmentPlans)
          .where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.clinicId, clinicId)))
          .limit(1)
          .for('update');
        if (!plan) throw new ClinicTreatmentPlanError('PLAN_NOT_FOUND', 'Treatment plan not found', 404);
        if (dentistId && plan.dentistId !== dentistId) throw new ClinicTreatmentPlanError('FORBIDDEN', 'Only the plan dentist can update plan items', 403);
        if (plan.status !== 'approved') {
          throw new ClinicTreatmentPlanError('PLAN_NOT_APPROVED', 'Approve this treatment plan before updating item progress', 409);
        }
        const [item] = await transaction
          .select({ id: treatmentPlanItems.id, status: treatmentPlanItems.status, serviceId: treatmentPlanItems.serviceId })
          .from(treatmentPlanItems)
          .where(
            and(
              eq(treatmentPlanItems.id, itemId),
              eq(treatmentPlanItems.planId, planId),
              eq(treatmentPlanItems.clinicId, clinicId),
              eq(treatmentPlanItems.patientId, plan.patientId),
            ),
          )
          .limit(1)
          .for('update');
        if (!item) throw new ClinicTreatmentPlanError('PLAN_ITEM_NOT_FOUND', 'Treatment plan item not found', 404);
        const currentStatus = item.status as TreatmentPlanItemStatus;
        if (!isItemStatus(input.status) || !allowedItemTransitions[currentStatus].includes(input.status)) {
          throw new ClinicTreatmentPlanError('INVALID_ITEM_STATUS', 'This item status transition is not allowed', 409);
        }
        if (input.status === 'completed') {
          if (!input.treatmentRecordId) throw new ClinicTreatmentPlanError('TREATMENT_RECORD_REQUIRED', 'A performed treatment record is required to complete this plan item', 409);
          const [record] = await transaction
            .select({ id: treatmentRecords.id, serviceId: treatmentRecords.serviceId })
            .from(treatmentRecords)
            .where(
              and(
                eq(treatmentRecords.id, input.treatmentRecordId),
                eq(treatmentRecords.clinicId, clinicId),
                eq(treatmentRecords.patientId, plan.patientId),
              ),
            )
            .limit(1);
          if (!record || (item.serviceId && record.serviceId !== item.serviceId)) {
            throw new ClinicTreatmentPlanError('TREATMENT_RECORD_MISMATCH', 'Treatment record does not match this plan item', 409);
          }
        }
        const [updated] = await transaction
          .update(treatmentPlanItems)
          .set({
            status: input.status,
            treatmentRecordId: input.status === 'completed' ? input.treatmentRecordId : null,
            completedAt: input.status === 'completed' ? new Date() : null,
          })
          .where(and(eq(treatmentPlanItems.id, itemId), eq(treatmentPlanItems.clinicId, clinicId)))
          .returning({ id: treatmentPlanItems.id, status: treatmentPlanItems.status });
        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId,
          entityType: 'treatment_plan_item',
          entityId: itemId,
          action: AuditAction.TREATMENT_PLAN_ITEM_STATUS_CHANGED,
          metadata: JSON.stringify({ planId, patientId: plan.patientId, fromStatus: currentStatus, toStatus: input.status, treatmentRecordId: input.treatmentRecordId ?? null }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
        return { id: updated.id, status: updated.status as TreatmentPlanItemStatus };
      }),
  };
}
