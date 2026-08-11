import { createHmac } from 'crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Client as StorageClient } from '@replit/object-storage';
import type { DB } from '@dentra/db';
import { remoteAssessments, clinics, auditEvents } from '@dentra/db/schema';
import type { AssessmentPhoto } from '@dentra/db/schema';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PHOTOS = 5;
const MAX_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
]);
const TOKEN_TTL_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class RemoteConsultError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'INVALID_INPUT'
      | 'TOO_MANY_PHOTOS'
      | 'INVALID_TYPE'
      | 'TOO_LARGE'
      | 'UPLOAD_FAILED'
      | 'ALREADY_REVIEWED'
      | 'CLINIC_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'RemoteConsultError';
  }
}

// ---------------------------------------------------------------------------
// Signed photo token helpers (mirrors clinical-files-service approach)
// ---------------------------------------------------------------------------

function getSecret(): string {
  return process.env.SESSION_SECRET ?? 'dentra-default-secret';
}

export function generatePhotoToken(assessmentId: string, clinicId: string, photoIndex: number): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${assessmentId}:${clinicId}:${photoIndex}:${exp}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64url');
}

export function verifyPhotoToken(
  token: string,
): { assessmentId: string; clinicId: string; photoIndex: number } | null {
  try {
    const { payload, sig } = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as {
      payload: string; sig: string;
    };
    const expected = createHmac('sha256', getSecret()).update(payload).digest('hex');
    if (expected.length !== sig.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) return null;
    const parts = payload.split(':');
    if (parts.length !== 4) return null;
    const [assessmentId, clinicId, photoIndexStr, expStr] = parts;
    if (Date.now() > parseInt(expStr, 10)) return null;
    return { assessmentId, clinicId, photoIndex: parseInt(photoIndexStr, 10) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmitConsultInput {
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  complaint: string;
  photos: Array<{
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  }>;
}

export interface ReviewConsultInput {
  dentistNotes: string;
  nextStep: 'in_clinic_visit' | 'prescription' | 'monitoring' | 'emergency' | 'none';
}

export type AssessmentListItem = {
  id: string;
  clinicId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string | null;
  complaint: string;
  photoCount: number;
  status: string;
  nextStep: string | null;
  dentistNotes: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

export type AssessmentDetail = AssessmentListItem & {
  photos: AssessmentPhoto[];
  emailSent: string;
  patientId: string | null;
  reviewedBy: string | null;
};

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface RemoteConsultsService {
  /**
   * Public: validate clinic exists, upload photos, create assessment row.
   */
  submitConsult(clinicId: string, input: SubmitConsultInput): Promise<{ assessmentId: string }>;

  /**
   * List assessments for a clinic, filtered by status.
   */
  listAssessments(
    clinicId: string,
    filters: {
      status?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<{ data: AssessmentListItem[]; total: number; page: number; pageSize: number }>;

  /**
   * Get detail for a single assessment (clinic-scoped).
   */
  getAssessment(clinicId: string, assessmentId: string): Promise<AssessmentDetail | null>;

  /**
   * Generate a short-lived signed URL for a specific photo.
   */
  generatePhotoUrl(
    clinicId: string,
    assessmentId: string,
    photoIndex: number,
  ): Promise<{ downloadUrl: string }>;

  /**
   * Stream a photo. Verifies the signed token.
   */
  streamPhoto(
    token: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null>;

  /**
   * Dentist submits their assessment (moves status → reviewed).
   */
  reviewAssessment(
    clinicId: string,
    assessmentId: string,
    reviewedBy: string,
    input: ReviewConsultInput,
  ): Promise<void>;

  /**
   * Close an assessment (no further action needed).
   */
  closeAssessment(clinicId: string, assessmentId: string, closedBy: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createRemoteConsultsService(db: DB): RemoteConsultsService {
  let _storage: StorageClient | null = null;
  function storage(): StorageClient {
    if (!_storage) _storage = new StorageClient();
    return _storage;
  }

  return {
    // ──────────────────────────────────────────────────────────────────────
    // submitConsult
    // ──────────────────────────────────────────────────────────────────────
    async submitConsult(clinicId, input) {
      // Validate clinic exists and is active
      const [clinic] = await db
        .select({ id: clinics.id, status: clinics.status })
        .from(clinics)
        .where(eq(clinics.id, clinicId))
        .limit(1);
      if (!clinic) throw new RemoteConsultError('CLINIC_NOT_FOUND', 'Clinic not found');
      if (clinic.status !== 'active' && clinic.status !== 'trial') {
        throw new RemoteConsultError('CLINIC_NOT_FOUND', 'This clinic is not currently accepting remote consultations');
      }

      if (!input.complaint.trim()) {
        throw new RemoteConsultError('INVALID_INPUT', 'Complaint description is required');
      }
      if (input.photos.length === 0) {
        throw new RemoteConsultError('INVALID_INPUT', 'At least one photo is required');
      }
      if (input.photos.length > MAX_PHOTOS) {
        throw new RemoteConsultError('TOO_MANY_PHOTOS', `Maximum ${MAX_PHOTOS} photos allowed`);
      }
      for (const photo of input.photos) {
        if (!ALLOWED_MIME_TYPES.has(photo.mimeType)) {
          throw new RemoteConsultError('INVALID_TYPE', `File type not allowed: ${photo.mimeType}. Use JPEG, PNG, WebP, or HEIC.`);
        }
        if (photo.sizeBytes > MAX_SIZE_BYTES) {
          throw new RemoteConsultError('TOO_LARGE', `Photo "${photo.originalFilename}" exceeds 20 MB limit`);
        }
      }

      const { randomUUID } = await import('crypto');
      const assessmentId = randomUUID();

      // Upload all photos to Object Storage
      const photoMeta: AssessmentPhoto[] = [];
      for (let i = 0; i < input.photos.length; i++) {
        const photo = input.photos[i];
        const storageKey = `teledentistry/${clinicId}/${assessmentId}/${i}`;
        const uploadResult = await storage().uploadFromBytes(storageKey, photo.buffer);
        if (!uploadResult.ok) {
          throw new RemoteConsultError('UPLOAD_FAILED', `Failed to upload photo "${photo.originalFilename}"`);
        }
        photoMeta.push({
          storageKey,
          originalFilename: photo.originalFilename,
          mimeType: photo.mimeType,
          sizeBytes: photo.sizeBytes,
          sortOrder: i,
        });
      }

      // Insert row + audit event atomically
      await db.transaction(async (tx) => {
        await tx.insert(remoteAssessments).values({
          id: assessmentId,
          clinicId,
          patientName:  input.patientName.trim(),
          patientEmail: input.patientEmail.trim().toLowerCase(),
          patientPhone: input.patientPhone?.trim() ?? null,
          complaint:    input.complaint.trim(),
          photos:       photoMeta,
          status:       'pending',
        });

        await tx.insert(auditEvents).values({
          clinicId,
          actorId: null,
          action:  'remote_assessment.submitted',
          entityType: 'remote_assessment',
          entityId: assessmentId,
          metadata: JSON.stringify({
            photoCount: photoMeta.length,
            patientEmail: input.patientEmail.trim().toLowerCase(),
          }),
        });
      });

      return { assessmentId };
    },

    // ──────────────────────────────────────────────────────────────────────
    // listAssessments
    // ──────────────────────────────────────────────────────────────────────
    async listAssessments(clinicId, { status, page, pageSize }) {
      const offset = (page - 1) * pageSize;
      const conditions = [eq(remoteAssessments.clinicId, clinicId)];
      if (status) conditions.push(eq(remoteAssessments.status, status));

      const [{ total }] = await db
        .select({ total: sql<number>`CAST(COUNT(*) AS int)` })
        .from(remoteAssessments)
        .where(and(...conditions));

      const rows = await db
        .select()
        .from(remoteAssessments)
        .where(and(...conditions))
        .orderBy(desc(remoteAssessments.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        data: rows.map((r) => ({
          id: r.id,
          clinicId: r.clinicId,
          patientName: r.patientName,
          patientEmail: r.patientEmail,
          patientPhone: r.patientPhone,
          complaint: r.complaint,
          photoCount: Array.isArray(r.photos) ? (r.photos as AssessmentPhoto[]).length : 0,
          status: r.status,
          nextStep: r.nextStep,
          dentistNotes: r.dentistNotes,
          reviewedAt: r.reviewedAt,
          createdAt: r.createdAt,
        })),
        total,
        page,
        pageSize,
      };
    },

    // ──────────────────────────────────────────────────────────────────────
    // getAssessment
    // ──────────────────────────────────────────────────────────────────────
    async getAssessment(clinicId, assessmentId) {
      const [row] = await db
        .select()
        .from(remoteAssessments)
        .where(and(
          eq(remoteAssessments.id, assessmentId),
          eq(remoteAssessments.clinicId, clinicId),
        ))
        .limit(1);
      if (!row) return null;

      const photos = Array.isArray(row.photos) ? (row.photos as AssessmentPhoto[]) : [];
      return {
        id: row.id,
        clinicId: row.clinicId,
        patientName: row.patientName,
        patientEmail: row.patientEmail,
        patientPhone: row.patientPhone,
        complaint: row.complaint,
        photoCount: photos.length,
        photos,
        status: row.status,
        nextStep: row.nextStep,
        dentistNotes: row.dentistNotes,
        reviewedAt: row.reviewedAt,
        emailSent: row.emailSent,
        patientId: row.patientId,
        reviewedBy: row.reviewedBy,
        createdAt: row.createdAt,
      };
    },

    // ──────────────────────────────────────────────────────────────────────
    // generatePhotoUrl
    // ──────────────────────────────────────────────────────────────────────
    async generatePhotoUrl(clinicId, assessmentId, photoIndex) {
      const assessment = await this.getAssessment(clinicId, assessmentId);
      if (!assessment) throw new RemoteConsultError('NOT_FOUND', 'Assessment not found');
      if (photoIndex < 0 || photoIndex >= assessment.photos.length) {
        throw new RemoteConsultError('NOT_FOUND', 'Photo index out of range');
      }
      const token = generatePhotoToken(assessmentId, clinicId, photoIndex);
      return {
        downloadUrl: `/v1/remote-consults/${assessmentId}/photos/${photoIndex}/download?token=${token}`,
      };
    },

    // ──────────────────────────────────────────────────────────────────────
    // streamPhoto
    // ──────────────────────────────────────────────────────────────────────
    async streamPhoto(token) {
      const verified = verifyPhotoToken(token);
      if (!verified) return null;

      const [row] = await db
        .select({ photos: remoteAssessments.photos })
        .from(remoteAssessments)
        .where(and(
          eq(remoteAssessments.id, verified.assessmentId),
          eq(remoteAssessments.clinicId, verified.clinicId),
        ))
        .limit(1);
      if (!row) return null;

      const photos = Array.isArray(row.photos) ? (row.photos as AssessmentPhoto[]) : [];
      const photo = photos[verified.photoIndex];
      if (!photo) return null;

      const result = await storage().downloadAsBytes(photo.storageKey);
      if (!result.ok) return null;
      const [buf] = result.value;

      return { buffer: buf, mimeType: photo.mimeType, filename: photo.originalFilename };
    },

    // ──────────────────────────────────────────────────────────────────────
    // reviewAssessment
    // ──────────────────────────────────────────────────────────────────────
    async reviewAssessment(clinicId, assessmentId, reviewedBy, input) {
      const assessment = await this.getAssessment(clinicId, assessmentId);
      if (!assessment) throw new RemoteConsultError('NOT_FOUND', 'Assessment not found');
      // Only pending assessments may be reviewed; reviewed/closed are terminal.
      if (assessment.status !== 'pending') {
        throw new RemoteConsultError('ALREADY_REVIEWED', `Cannot review an assessment with status '${assessment.status}'`);
      }

      await db.transaction(async (tx) => {
        await tx
          .update(remoteAssessments)
          .set({
            status:       'reviewed',
            dentistNotes: input.dentistNotes.trim(),
            nextStep:     input.nextStep,
            reviewedBy,
            reviewedAt:   new Date(),
            updatedAt:    new Date(),
          })
          .where(and(
            eq(remoteAssessments.id, assessmentId),
            eq(remoteAssessments.clinicId, clinicId),
          ));

        await tx.insert(auditEvents).values({
          clinicId,
          actorId: reviewedBy,
          action: 'remote_assessment.reviewed',
          entityType: 'remote_assessment',
          entityId: assessmentId,
          metadata: JSON.stringify({ nextStep: input.nextStep }),
        });
      });
    },

    // ──────────────────────────────────────────────────────────────────────
    // closeAssessment
    // ──────────────────────────────────────────────────────────────────────
    async closeAssessment(clinicId, assessmentId, closedBy) {
      const assessment = await this.getAssessment(clinicId, assessmentId);
      if (!assessment) throw new RemoteConsultError('NOT_FOUND', 'Assessment not found');
      // Already closed — idempotent guard
      if (assessment.status === 'closed') {
        throw new RemoteConsultError('ALREADY_REVIEWED', 'Assessment is already closed');
      }

      await db.transaction(async (tx) => {
        await tx
          .update(remoteAssessments)
          .set({ status: 'closed', updatedAt: new Date() })
          .where(and(
            eq(remoteAssessments.id, assessmentId),
            eq(remoteAssessments.clinicId, clinicId),
          ));

        await tx.insert(auditEvents).values({
          clinicId,
          actorId: closedBy,
          action: 'remote_assessment.closed',
          entityType: 'remote_assessment',
          entityId: assessmentId,
          metadata: JSON.stringify({}),
        });
      });
    },
  };
}
