import { createHmac, randomUUID } from 'crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Client as StorageClient } from '@replit/object-storage';
import type { DB } from '@dentra/db';
import {
  clinicalFiles,
  patients,
  encounters,
  auditEvents,
} from '@dentra/db/schema';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

const VALID_FILE_TYPES = new Set([
  'radiograph',
  'intraoral_photo',
  'extraoral_photo',
  'consent_form',
  'lab_result',
  'referral_letter',
  'other',
]);

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class ClinicalFileError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'INVALID_TYPE'
      | 'TOO_LARGE'
      | 'UPLOAD_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'ClinicalFileError';
  }
}

// ---------------------------------------------------------------------------
// Signed URL token helpers
// ---------------------------------------------------------------------------

function getSecret(): string {
  return process.env.SESSION_SECRET ?? 'dentra-default-secret';
}

export function generateSignedToken(fileId: string, clinicId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${fileId}:${clinicId}:${exp}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64url');
}

export function verifySignedToken(token: string): { fileId: string; clinicId: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as {
      payload: string;
      sig: string;
    };
    const { payload, sig } = decoded;
    const expected = createHmac('sha256', getSecret()).update(payload).digest('hex');
    // Constant-time compare
    if (expected.length !== sig.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) return null;
    const parts = payload.split(':');
    if (parts.length !== 3) return null;
    const [fileId, clinicId, expStr] = parts;
    if (Date.now() > parseInt(expStr, 10)) return null;
    return { fileId, clinicId };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadFileInput {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  fileType: string;
  encounterId?: string | null;
  patientId: string;
  branchId: string;
  toothRef?: string | null;
  notes?: string | null;
  uploadedBy: string;
  /** Caller branch IDs for access control (null = clinic-wide). */
  callerBranchIds?: string[] | null;
}

export interface ClinicalFileListItem {
  id: string;
  fileType: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  toothRef: string | null;
  notes: string | null;
  uploadedBy: string | null;
  encounterId: string | null;
  patientId: string;
  branchId: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface ClinicFilesService {
  /**
   * Validate and upload a file to Object Storage, insert metadata row.
   * Returns the new file's ID.
   */
  uploadFile(clinicId: string, input: UploadFileInput): Promise<{ fileId: string }>;

  /**
   * List files for a clinic, filtered by encounter or patient.
   */
  listFiles(
    clinicId: string,
    filters: {
      encounterId?: string | null;
      patientId?: string | null;
      page: number;
      pageSize: number;
      callerBranchIds?: string[] | null;
    },
  ): Promise<{ data: ClinicalFileListItem[]; total: number; page: number; pageSize: number }>;

  /**
   * Get a single file metadata row.
   * Returns null if not found or caller cannot access it.
   */
  getFile(
    clinicId: string,
    fileId: string,
    callerBranchIds?: string[] | null,
  ): Promise<ClinicalFileListItem | null>;

  /**
   * Generate a short-lived signed token for a file.
   * Writes an audit event; returns the download URL.
   */
  generateSignedUrl(
    clinicId: string,
    fileId: string,
    requestedBy: string,
    callerBranchIds?: string[] | null,
  ): Promise<{ downloadUrl: string }>;

  /**
   * Read a file from Object Storage. Verifies the signed token.
   * Returns { buffer, mimeType, filename } or null if token invalid / file not found.
   */
  streamFile(
    token: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null>;

  /**
   * Soft-delete a file metadata row and remove from Object Storage.
   */
  deleteFile(
    clinicId: string,
    fileId: string,
    deletedBy: string,
    callerBranchIds?: string[] | null,
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createClinicFilesService(db: DB): ClinicFilesService {
  // Lazy-initialize storage client on first use so a missing bucket
  // env var doesn't crash the whole API process at boot time.
  let _storage: StorageClient | null = null;
  function storage(): StorageClient {
    if (!_storage) _storage = new StorageClient();
    return _storage;
  }

  return {
    // ────────────────────────────────────────────────────────────────────
    // uploadFile
    // ────────────────────────────────────────────────────────────────────
    async uploadFile(clinicId, input) {
      if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
        throw new ClinicalFileError(
          'INVALID_TYPE',
          `File type not allowed. Accepted: JPEG, PNG, WebP, HEIC, PDF`,
        );
      }
      if (input.sizeBytes > MAX_SIZE_BYTES) {
        throw new ClinicalFileError(
          'TOO_LARGE',
          `File exceeds the 20 MB limit (received ${Math.round(input.sizeBytes / 1024 / 1024 * 10) / 10} MB)`,
        );
      }
      if (!VALID_FILE_TYPES.has(input.fileType)) {
        throw new ClinicalFileError('INVALID_TYPE', 'Unknown file type category');
      }
      if (input.callerBranchIds && input.callerBranchIds.length > 0
          && !input.callerBranchIds.includes(input.branchId)) {
        throw new ClinicalFileError('FORBIDDEN', 'You do not have access to this branch');
      }

      const fileId = randomUUID();
      const storageKey = `clinical/${clinicId}/${fileId}`;

      // Upload to Object Storage
      const uploadResult = await storage().uploadFromBytes(storageKey, input.buffer);
      if (!uploadResult.ok) {
        throw new ClinicalFileError('UPLOAD_FAILED', 'Failed to store file. Please try again.');
      }

      // Atomic: insert metadata + audit event
      await db.transaction(async (tx) => {
        await tx.insert(clinicalFiles).values({
          id: fileId,
          clinicId,
          branchId: input.branchId,
          patientId: input.patientId,
          encounterId: input.encounterId ?? null,
          fileType: input.fileType,
          storageKey,
          originalFilename: input.originalFilename,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          toothRef: input.toothRef ?? null,
          notes: input.notes ?? null,
          uploadedBy: input.uploadedBy,
        });

        await tx.insert(auditEvents).values({
          clinicId,
          actorId: input.uploadedBy,
          action: 'file.uploaded',
          entityType: 'clinical_file',
          entityId: fileId,
          metadata: JSON.stringify({
            fileType: input.fileType,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            encounterId: input.encounterId,
            patientId: input.patientId,
          }),
        });
      });

      return { fileId };
    },

    // ────────────────────────────────────────────────────────────────────
    // listFiles
    // ────────────────────────────────────────────────────────────────────
    async listFiles(clinicId, { encounterId, patientId, page, pageSize, callerBranchIds }) {
      const offset = (page - 1) * pageSize;
      const conditions = [eq(clinicalFiles.clinicId, clinicId)];
      if (encounterId) conditions.push(eq(clinicalFiles.encounterId, encounterId));
      if (patientId) conditions.push(eq(clinicalFiles.patientId, patientId));
      if (callerBranchIds && callerBranchIds.length > 0) {
        conditions.push(inArray(clinicalFiles.branchId, callerBranchIds));
      }
      const where = and(...conditions);

      const [{ total }] = await db
        .select({ total: sql<number>`CAST(COUNT(*) AS int)` })
        .from(clinicalFiles)
        .where(where);

      const rows = await db
        .select()
        .from(clinicalFiles)
        .where(where)
        .orderBy(desc(clinicalFiles.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        data: rows.map((r) => ({
          id: r.id,
          fileType: r.fileType,
          originalFilename: r.originalFilename,
          mimeType: r.mimeType,
          sizeBytes: r.sizeBytes,
          toothRef: r.toothRef,
          notes: r.notes,
          uploadedBy: r.uploadedBy,
          encounterId: r.encounterId,
          patientId: r.patientId,
          branchId: r.branchId,
          createdAt: r.createdAt,
        })),
        total,
        page,
        pageSize,
      };
    },

    // ────────────────────────────────────────────────────────────────────
    // getFile
    // ────────────────────────────────────────────────────────────────────
    async getFile(clinicId, fileId, callerBranchIds) {
      const [row] = await db
        .select()
        .from(clinicalFiles)
        .where(and(eq(clinicalFiles.id, fileId), eq(clinicalFiles.clinicId, clinicId)))
        .limit(1);
      if (!row) return null;
      if (callerBranchIds && callerBranchIds.length > 0 && !callerBranchIds.includes(row.branchId)) return null;
      return {
        id: row.id,
        fileType: row.fileType,
        originalFilename: row.originalFilename,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        toothRef: row.toothRef,
        notes: row.notes,
        uploadedBy: row.uploadedBy,
        encounterId: row.encounterId,
        patientId: row.patientId,
        branchId: row.branchId,
        createdAt: row.createdAt,
      };
    },

    // ────────────────────────────────────────────────────────────────────
    // generateSignedUrl
    // ────────────────────────────────────────────────────────────────────
    async generateSignedUrl(clinicId, fileId, requestedBy, callerBranchIds) {
      const file = await this.getFile(clinicId, fileId, callerBranchIds);
      if (!file) throw new ClinicalFileError('NOT_FOUND', 'File not found');

      const token = generateSignedToken(fileId, clinicId);

      await db.insert(auditEvents).values({
        clinicId,
        actorId: requestedBy,
        action: 'file.url_generated',
        entityType: 'clinical_file',
        entityId: fileId,
        metadata: JSON.stringify({ fileId, clinicId }),
      });

      return { downloadUrl: `/v1/clinic/${clinicId}/files/${fileId}/download?token=${token}` };
    },

    // ────────────────────────────────────────────────────────────────────
    // streamFile
    // ────────────────────────────────────────────────────────────────────
    async streamFile(token) {
      const verified = verifySignedToken(token);
      if (!verified) return null;

      const [row] = await db
        .select({
          id: clinicalFiles.id,
          storageKey: clinicalFiles.storageKey,
          mimeType: clinicalFiles.mimeType,
          originalFilename: clinicalFiles.originalFilename,
        })
        .from(clinicalFiles)
        .where(
          and(
            eq(clinicalFiles.id, verified.fileId),
            eq(clinicalFiles.clinicId, verified.clinicId),
          ),
        )
        .limit(1);

      if (!row) return null;

      const result = await storage().downloadAsBytes(row.storageKey);
      if (!result.ok) return null;
      // SDK returns [Buffer] (tuple); flatten to a single Buffer
      const [buf] = result.value;

      return {
        buffer: buf,
        mimeType: row.mimeType,
        filename: row.originalFilename,
      };
    },

    // ────────────────────────────────────────────────────────────────────
    // deleteFile
    // ────────────────────────────────────────────────────────────────────
    async deleteFile(clinicId, fileId, deletedBy, callerBranchIds) {
      const file = await this.getFile(clinicId, fileId, callerBranchIds);
      if (!file) throw new ClinicalFileError('NOT_FOUND', 'File not found');

      // Load storage key
      const [row] = await db
        .select({ storageKey: clinicalFiles.storageKey })
        .from(clinicalFiles)
        .where(and(eq(clinicalFiles.id, fileId), eq(clinicalFiles.clinicId, clinicId)))
        .limit(1);

      if (row) {
        await storage().delete(row.storageKey);
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(clinicalFiles)
          .where(and(eq(clinicalFiles.id, fileId), eq(clinicalFiles.clinicId, clinicId)));
        await tx.insert(auditEvents).values({
          clinicId,
          actorId: deletedBy,
          action: 'file.deleted',
          entityType: 'clinical_file',
          entityId: fileId,
          metadata: JSON.stringify({ fileId, clinicId }),
        });
      });
    },
  };
}
