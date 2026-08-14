import { and, eq, isNull } from 'drizzle-orm';
import { Client as StorageClient } from '@replit/object-storage';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { clinics } from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type BrandingKind = 'logo' | 'cover';
export type CoverMode = 'image' | 'gradient';

export class ClinicBrandingError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'INVALID_TYPE' | 'TOO_LARGE' | 'UPLOAD_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'ClinicBrandingError';
  }
}

export type ClinicBrandingActor = { id: string; email: string; ipAddress?: string; userAgent?: string };

export type ClinicBrandingService = {
  uploadImage: (
    clinicId: string,
    kind: BrandingKind,
    input: { buffer: Buffer; mimeType: string; sizeBytes: number },
    actor: ClinicBrandingActor,
  ) => Promise<{ updatedAt: string }>;
  setCoverMode: (clinicId: string, coverMode: CoverMode, actor: ClinicBrandingActor) => Promise<{ coverMode: string }>;
  streamImage: (clinicId: string, kind: BrandingKind) => Promise<{ buffer: Buffer; mimeType: string } | null>;
};

export function createClinicBrandingService(db: DB): ClinicBrandingService {
  // Lazy-initialize storage client on first use so a missing bucket
  // env var doesn't crash the whole API process at boot time.
  let _storage: StorageClient | null = null;
  function storage(): StorageClient {
    if (!_storage) _storage = new StorageClient();
    return _storage;
  }

  return {
    async uploadImage(clinicId, kind, input, actor) {
      if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
        throw new ClinicBrandingError('INVALID_TYPE', 'Only JPEG, PNG, or WebP images are allowed');
      }
      if (input.sizeBytes > MAX_SIZE_BYTES) {
        throw new ClinicBrandingError(
          'TOO_LARGE',
          `Image exceeds the 5 MB limit (received ${Math.round((input.sizeBytes / 1024 / 1024) * 10) / 10} MB)`,
        );
      }

      const storageKey = `branding/${clinicId}/${kind}`;
      const uploadResult = await storage().uploadFromBytes(storageKey, input.buffer);
      if (!uploadResult.ok) {
        throw new ClinicBrandingError('UPLOAD_FAILED', 'Failed to store the image. Please try again.');
      }

      const now = new Date();
      const column =
        kind === 'logo'
          ? { logoUpdatedAt: now, logoMimeType: input.mimeType }
          : { coverUpdatedAt: now, coverMimeType: input.mimeType };

      const [updated] = await db
        .update(clinics)
        .set(column)
        .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
        .returning({ id: clinics.id });
      if (!updated) throw new ClinicBrandingError('NOT_FOUND', 'Clinic not found');

      await writeAudit(db, {
        actorId: actor.id,
        actorEmail: actor.email,
        clinicId,
        entityType: 'clinic',
        entityId: clinicId,
        action: AuditAction.CLINIC_UPDATED,
        metadata: JSON.stringify({ fields: [kind === 'logo' ? 'logoUrl' : 'coverUrl'] }),
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      return { updatedAt: now.toISOString() };
    },

    async setCoverMode(clinicId, coverMode, actor) {
      const [updated] = await db
        .update(clinics)
        .set({ coverMode })
        .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
        .returning({ id: clinics.id, coverMode: clinics.coverMode });
      if (!updated) throw new ClinicBrandingError('NOT_FOUND', 'Clinic not found');

      await writeAudit(db, {
        actorId: actor.id,
        actorEmail: actor.email,
        clinicId,
        entityType: 'clinic',
        entityId: clinicId,
        action: AuditAction.CLINIC_UPDATED,
        metadata: JSON.stringify({ fields: ['coverMode'] }),
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      return { coverMode: updated.coverMode };
    },

    async streamImage(clinicId, kind) {
      const [row] = await db
        .select({
          logoMimeType: clinics.logoMimeType,
          coverMimeType: clinics.coverMimeType,
        })
        .from(clinics)
        .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
        .limit(1);
      if (!row) return null;

      const mimeType = kind === 'logo' ? row.logoMimeType : row.coverMimeType;
      if (!mimeType) return null;

      const storageKey = `branding/${clinicId}/${kind}`;
      const result = await storage().downloadAsBytes(storageKey);
      if (!result.ok) return null;
      const [buf] = result.value;

      return { buffer: buf, mimeType };
    },
  };
}
