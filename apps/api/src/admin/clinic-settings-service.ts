import { and, desc, eq, gt, isNull, lte, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import {
  clinicFeatureOverrides,
  clinics,
  clinicSubscriptions,
  packageFeatures,
  packages,
} from '@dentra/db/schema';
import { AuditAction, FeatureKey } from '@dentra/shared';
import type { FeatureKey as FeatureKeyValue } from '@dentra/shared';

export type AdminSettingsActor = {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

export type AdminClinicSettingsErrorCode =
  | 'CLINIC_NOT_FOUND'
  | 'PACKAGE_NOT_AVAILABLE'
  | 'PACKAGE_ALREADY_ASSIGNED'
  | 'FUTURE_ASSIGNMENT_EXISTS'
  | 'OVERRIDE_NOT_FOUND'
  | 'INVALID_OVERRIDE_EXPIRY'
  | 'PUBLICATION_UNCHANGED'
  | 'CLINIC_NOT_OPERATIONAL'
  | 'FEATURE_NOT_ENTITLED';

export class AdminClinicSettingsError extends Error {
  constructor(
    public readonly code: AdminClinicSettingsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminClinicSettingsError';
  }
}

export type AdminClinicSettingsService = {
  assignPackage: (
    clinicId: string,
    input: { packageId: string; effectiveAt: Date },
    actor: AdminSettingsActor,
  ) => Promise<{
    id: string;
    clinicId: string;
    packageId: string;
    status: typeof clinicSubscriptions.$inferSelect.status;
    startsAt: Date;
    expiresAt: Date | null;
  }>;
  setFeatureOverride: (
    clinicId: string,
    input: {
      featureKey: FeatureKeyValue;
      isEnabled: boolean;
      reason: string;
      expiresAt: Date | null;
    },
    actor: AdminSettingsActor,
  ) => Promise<{
    id: string;
    featureKey: string;
    isEnabled: boolean;
    reason: string;
    expiresAt: Date | null;
    createdAt: Date;
  }>;
  removeFeatureOverride: (
    clinicId: string,
    overrideId: string,
    actor: AdminSettingsActor,
  ) => Promise<{ id: string; featureKey: string }>;
  updatePublication: (
    clinicId: string,
    publicationStatus: 'published' | 'unpublished',
    actor: AdminSettingsActor,
  ) => Promise<{
    id: string;
    publicationStatus: 'published' | 'unpublished';
    updatedAt: Date;
  }>;
};

function activeAt(timestamp: Date) {
  return and(
    lte(clinicSubscriptions.startsAt, timestamp),
    or(
      isNull(clinicSubscriptions.expiresAt),
      gt(clinicSubscriptions.expiresAt, timestamp),
    ),
  );
}

function activeOverrideAt(timestamp: Date) {
  return or(
    isNull(clinicFeatureOverrides.expiresAt),
    gt(clinicFeatureOverrides.expiresAt, timestamp),
  );
}

export function createAdminClinicSettingsService(
  database: DB,
): AdminClinicSettingsService {
  return {
    assignPackage: async (clinicId, input, actor) =>
      database.transaction(async (transaction) => {
        const now = new Date();
        const [clinic] = await transaction
          .select({ id: clinics.id })
          .from(clinics)
          .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
          .limit(1)
          .for('update');
        if (!clinic) {
          throw new AdminClinicSettingsError('CLINIC_NOT_FOUND', 'Clinic not found');
        }

        const [selectedPackage] = await transaction
          .select({ id: packages.id })
          .from(packages)
          .where(and(eq(packages.id, input.packageId), eq(packages.isActive, true)))
          .limit(1);
        if (!selectedPackage) {
          throw new AdminClinicSettingsError(
            'PACKAGE_NOT_AVAILABLE',
            'The selected package is not available',
          );
        }

        const [futureAssignment] = await transaction
          .select({ id: clinicSubscriptions.id })
          .from(clinicSubscriptions)
          .where(
            and(
              eq(clinicSubscriptions.clinicId, clinicId),
              gt(clinicSubscriptions.startsAt, now),
            ),
          )
          .limit(1);
        if (futureAssignment) {
          throw new AdminClinicSettingsError(
            'FUTURE_ASSIGNMENT_EXISTS',
            'This clinic already has a future package change scheduled',
          );
        }

        const [currentSubscription] = await transaction
          .select({
            id: clinicSubscriptions.id,
            packageId: clinicSubscriptions.packageId,
            status: clinicSubscriptions.status,
          })
          .from(clinicSubscriptions)
          .where(
            and(
              eq(clinicSubscriptions.clinicId, clinicId),
              activeAt(input.effectiveAt),
            ),
          )
          .orderBy(desc(clinicSubscriptions.startsAt))
          .limit(1);
        if (currentSubscription?.packageId === input.packageId) {
          throw new AdminClinicSettingsError(
            'PACKAGE_ALREADY_ASSIGNED',
            'The selected package is already effective for this clinic',
          );
        }

        if (currentSubscription) {
          await transaction
            .update(clinicSubscriptions)
            .set({
              expiresAt: input.effectiveAt,
              status: input.effectiveAt <= now
                ? 'expired'
                : currentSubscription.status,
            })
            .where(eq(clinicSubscriptions.id, currentSubscription.id));
        }

        const nextStatus = currentSubscription?.status === 'trial'
          ? 'trial' as const
          : 'active' as const;
        const [subscription] = await transaction
          .insert(clinicSubscriptions)
          .values({
            clinicId,
            packageId: input.packageId,
            status: nextStatus,
            startsAt: input.effectiveAt,
            assignedBy: actor.id,
          })
          .returning({
            id: clinicSubscriptions.id,
            clinicId: clinicSubscriptions.clinicId,
            packageId: clinicSubscriptions.packageId,
            status: clinicSubscriptions.status,
            startsAt: clinicSubscriptions.startsAt,
            expiresAt: clinicSubscriptions.expiresAt,
          });

        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId,
          entityType: 'clinic_subscription',
          entityId: subscription.id,
          action: currentSubscription
            ? AuditAction.SUBSCRIPTION_CHANGED
            : AuditAction.SUBSCRIPTION_ASSIGNED,
          metadata: JSON.stringify({
            previousPackageId: currentSubscription?.packageId ?? null,
            nextPackageId: input.packageId,
            effectiveAt: input.effectiveAt.toISOString(),
          }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });

        return subscription;
      }),

    setFeatureOverride: async (clinicId, input, actor) =>
      database.transaction(async (transaction) => {
        const now = new Date();
        const [clinic] = await transaction
          .select({ id: clinics.id })
          .from(clinics)
          .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
          .limit(1)
          .for('update');
        if (!clinic) {
          throw new AdminClinicSettingsError('CLINIC_NOT_FOUND', 'Clinic not found');
        }
        if (input.expiresAt && input.expiresAt <= now) {
          throw new AdminClinicSettingsError(
            'INVALID_OVERRIDE_EXPIRY',
            'Override expiry must be in the future',
          );
        }

        await transaction
          .update(clinicFeatureOverrides)
          .set({ expiresAt: now })
          .where(
            and(
              eq(clinicFeatureOverrides.clinicId, clinicId),
              eq(clinicFeatureOverrides.featureKey, input.featureKey),
              activeOverrideAt(now),
            ),
          );

        const [override] = await transaction
          .insert(clinicFeatureOverrides)
          .values({
            clinicId,
            featureKey: input.featureKey,
            isEnabled: input.isEnabled,
            reason: input.reason,
            grantedBy: actor.id,
            expiresAt: input.expiresAt,
          })
          .returning({
            id: clinicFeatureOverrides.id,
            featureKey: clinicFeatureOverrides.featureKey,
            isEnabled: clinicFeatureOverrides.isEnabled,
            reason: clinicFeatureOverrides.reason,
            expiresAt: clinicFeatureOverrides.expiresAt,
            createdAt: clinicFeatureOverrides.createdAt,
          });

        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId,
          entityType: 'clinic_feature_override',
          entityId: override.id,
          action: AuditAction.FEATURE_OVERRIDE_SET,
          metadata: JSON.stringify({
            featureKey: override.featureKey,
            isEnabled: override.isEnabled,
          }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
        return override;
      }),

    removeFeatureOverride: async (clinicId, overrideId, actor) =>
      database.transaction(async (transaction) => {
        const now = new Date();
        const [clinic] = await transaction
          .select({ id: clinics.id })
          .from(clinics)
          .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
          .limit(1)
          .for('update');
        if (!clinic) {
          throw new AdminClinicSettingsError('CLINIC_NOT_FOUND', 'Clinic not found');
        }

        const [override] = await transaction
          .select({
            id: clinicFeatureOverrides.id,
            featureKey: clinicFeatureOverrides.featureKey,
          })
          .from(clinicFeatureOverrides)
          .where(
            and(
              eq(clinicFeatureOverrides.id, overrideId),
              eq(clinicFeatureOverrides.clinicId, clinicId),
              activeOverrideAt(now),
            ),
          )
          .limit(1);
        if (!override) {
          throw new AdminClinicSettingsError(
            'OVERRIDE_NOT_FOUND',
            'Active feature override not found',
          );
        }

        await transaction
          .update(clinicFeatureOverrides)
          .set({ expiresAt: now })
          .where(
            and(
              eq(clinicFeatureOverrides.clinicId, clinicId),
              eq(clinicFeatureOverrides.featureKey, override.featureKey),
              activeOverrideAt(now),
            ),
          );
        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId,
          entityType: 'clinic_feature_override',
          entityId: override.id,
          action: AuditAction.FEATURE_OVERRIDE_REMOVED,
          metadata: JSON.stringify({ featureKey: override.featureKey }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
        return override;
      }),

    updatePublication: async (clinicId, publicationStatus, actor) =>
      database.transaction(async (transaction) => {
        const now = new Date();
        const [clinic] = await transaction
          .select({
            id: clinics.id,
            status: clinics.status,
            publicationStatus: clinics.publicationStatus,
          })
          .from(clinics)
          .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
          .limit(1)
          .for('update');
        if (!clinic) {
          throw new AdminClinicSettingsError('CLINIC_NOT_FOUND', 'Clinic not found');
        }
        if (clinic.publicationStatus === publicationStatus) {
          throw new AdminClinicSettingsError(
            'PUBLICATION_UNCHANGED',
            `Clinic microsite is already ${publicationStatus}`,
          );
        }

        if (publicationStatus === 'published') {
          if (clinic.status !== 'trial' && clinic.status !== 'active') {
            throw new AdminClinicSettingsError(
              'CLINIC_NOT_OPERATIONAL',
              'Only trial or active clinics can publish a microsite',
            );
          }

          const [subscription] = await transaction
            .select({ packageId: clinicSubscriptions.packageId })
            .from(clinicSubscriptions)
            .where(
              and(eq(clinicSubscriptions.clinicId, clinicId), activeAt(now)),
            )
            .orderBy(desc(clinicSubscriptions.startsAt))
            .limit(1);
          const [packageEntitlement] = subscription
            ? await transaction
                .select({ isEnabled: packageFeatures.isEnabled })
                .from(packageFeatures)
                .where(
                  and(
                    eq(packageFeatures.packageId, subscription.packageId),
                    eq(packageFeatures.featureKey, FeatureKey.MICROSITE_PUBLISH),
                  ),
                )
                .limit(1)
            : [];
          const [override] = await transaction
            .select({ isEnabled: clinicFeatureOverrides.isEnabled })
            .from(clinicFeatureOverrides)
            .where(
              and(
                eq(clinicFeatureOverrides.clinicId, clinicId),
                eq(
                  clinicFeatureOverrides.featureKey,
                  FeatureKey.MICROSITE_PUBLISH,
                ),
                activeOverrideAt(now),
              ),
            )
            .orderBy(desc(clinicFeatureOverrides.createdAt))
            .limit(1);
          const canPublish = override?.isEnabled ?? packageEntitlement?.isEnabled ?? false;
          if (!canPublish) {
            throw new AdminClinicSettingsError(
              'FEATURE_NOT_ENTITLED',
              'This clinic is not entitled to publish a microsite',
            );
          }
        }

        const [updatedClinic] = await transaction
          .update(clinics)
          .set({ publicationStatus })
          .where(eq(clinics.id, clinicId))
          .returning({
            id: clinics.id,
            publicationStatus: clinics.publicationStatus,
            updatedAt: clinics.updatedAt,
          });
        await writeAudit(transaction, {
          actorId: actor.id,
          actorEmail: actor.email,
          clinicId,
          entityType: 'clinic',
          entityId: clinicId,
          action: publicationStatus === 'published'
            ? AuditAction.CLINIC_PUBLISHED
            : AuditAction.CLINIC_UNPUBLISHED,
          metadata: JSON.stringify({
            previousStatus: clinic.publicationStatus,
            nextStatus: publicationStatus,
          }),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
        return updatedClinic as {
          id: string;
          publicationStatus: 'published' | 'unpublished';
          updatedAt: Date;
        };
      }),
  };
}
