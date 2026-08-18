import { randomUUID } from 'node:crypto';
import { Client as StorageClient } from '@replit/object-storage';
import { and, desc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { clinics, clinicMemberships, dentists, users, verificationSubmissions } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';
import { dentistVerificationNotification, type NotificationService } from '../notifications/service.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
export type VerificationActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export type VerificationDocument = { type: string; storageKey: string; filename: string; mimeType: string; sizeBytes: number };
export type VerificationUpload = Omit<VerificationDocument, 'storageKey'> & { buffer: Buffer };
export type VerificationService = ReturnType<typeof createVerificationService>;
export class VerificationError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }

function documents(value: string): VerificationDocument[] {
  try {
    const parsed = JSON.parse(value) as Array<Partial<VerificationDocument>>;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item.storageKey === 'string').map((item) => ({ type: item.type ?? 'Supporting document', storageKey: item.storageKey!, filename: item.filename ?? 'verification-document', mimeType: item.mimeType ?? 'application/octet-stream', sizeBytes: item.sizeBytes ?? 0 })) : [];
  } catch { return []; }
}

export function createVerificationService(database: DB, notifications?: NotificationService) {
  let storageClient: StorageClient | null = null;
  const storage = () => storageClient ??= new StorageClient();

  return {
    submit: async (input: { subjectType: 'dentist' | 'clinic'; dentistId?: string; clinicId?: string; documents: VerificationUpload[]; submittedBy: string }) => {
      if ((input.subjectType === 'dentist' && !input.dentistId) || (input.subjectType === 'clinic' && !input.clinicId)) throw new VerificationError('SUBJECT_REQUIRED', 'A verification subject is required');
      if (!input.documents.length || input.documents.length > 5) throw new VerificationError('DOCUMENTS_REQUIRED', 'Attach between 1 and 5 documents');
      for (const file of input.documents) {
        if (!ALLOWED_MIME_TYPES.has(file.mimeType)) throw new VerificationError('INVALID_FILE_TYPE', 'Only PDF, JPEG, PNG, and WebP documents are accepted', 422);
        if (file.sizeBytes > MAX_FILE_BYTES) throw new VerificationError('FILE_TOO_LARGE', 'Each verification document must be 10 MB or smaller', 413);
      }
      const existing = await database.select({ id: verificationSubmissions.id }).from(verificationSubmissions).where(and(eq(verificationSubmissions.status, 'pending'), input.dentistId ? eq(verificationSubmissions.dentistId, input.dentistId) : eq(verificationSubmissions.clinicId, input.clinicId!))).limit(1);
      if (existing.length) throw new VerificationError('PENDING_EXISTS', 'A verification submission is already pending review', 409);

      const submissionId = randomUUID();
      const stored: VerificationDocument[] = [];
      try {
        for (const [index, file] of input.documents.entries()) {
          const storageKey = `verification/${input.subjectType}/${input.dentistId ?? input.clinicId}/${submissionId}/${index}`;
          const result = await storage().uploadFromBytes(storageKey, file.buffer);
          if (!result.ok) throw new VerificationError('UPLOAD_FAILED', `Could not store ${file.filename}`, 502);
          stored.push({ type: file.type, storageKey, filename: file.filename, mimeType: file.mimeType, sizeBytes: file.sizeBytes });
        }
        await database.transaction(async (tx) => {
          await tx.insert(verificationSubmissions).values({ id: submissionId, subjectType: input.subjectType, dentistId: input.dentistId ?? null, clinicId: input.clinicId ?? null, documents: JSON.stringify(stored), submittedBy: input.submittedBy });
          if (input.dentistId) await tx.update(dentists).set({ verificationStatus: 'pending' }).where(eq(dentists.id, input.dentistId));
          if (input.clinicId) await tx.update(clinics).set({ verificationStatus: 'pending' }).where(eq(clinics.id, input.clinicId));
          await writeAudit(tx as unknown as DB, { actorId: input.submittedBy, clinicId: input.clinicId, entityType: 'verification_submission', entityId: submissionId, action: AuditAction.VERIFICATION_SUBMITTED, metadata: JSON.stringify({ subjectType: input.subjectType, documentTypes: stored.map((item) => item.type), documentCount: stored.length }) });
        });
        return { id: submissionId };
      } catch (caught) {
        await Promise.all(stored.map((file) => storage().delete(file.storageKey).catch(() => undefined)));
        throw caught;
      }
    },

    listForSubject: async (input: { clinicId?: string; dentistId?: string }) => {
      const rows = await database.select({ id: verificationSubmissions.id, subjectType: verificationSubmissions.subjectType, status: verificationSubmissions.status, documents: verificationSubmissions.documents, reviewReason: verificationSubmissions.reviewReason, expiresAt: verificationSubmissions.expiresAt, reviewedAt: verificationSubmissions.reviewedAt, createdAt: verificationSubmissions.createdAt }).from(verificationSubmissions).where(input.dentistId ? eq(verificationSubmissions.dentistId, input.dentistId) : eq(verificationSubmissions.clinicId, input.clinicId!)).orderBy(desc(verificationSubmissions.createdAt));
      return rows.map(({ documents: raw, ...row }) => ({ ...row, documentTypes: documents(raw).map((item) => item.type), documentCount: documents(raw).length }));
    },

    list: async (filter: 'all' | 'pending' | 'approved' | 'rejected' | 'revoked' | 'expiring') => {
      const now = new Date(); const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const condition = filter === 'all' ? undefined : filter === 'expiring' ? and(eq(verificationSubmissions.status, 'approved'), isNotNull(verificationSubmissions.expiresAt), gte(verificationSubmissions.expiresAt, now), lte(verificationSubmissions.expiresAt, threshold)) : eq(verificationSubmissions.status, filter);
      const rows = await database.select({ id: verificationSubmissions.id, subjectType: verificationSubmissions.subjectType, dentistId: verificationSubmissions.dentistId, clinicId: verificationSubmissions.clinicId, dentistName: sql<string | null>`concat(${dentists.firstName}, ' ', ${dentists.lastName})`, clinicName: clinics.name, status: verificationSubmissions.status, documents: verificationSubmissions.documents, reviewReason: verificationSubmissions.reviewReason, expiresAt: verificationSubmissions.expiresAt, reviewedAt: verificationSubmissions.reviewedAt, createdAt: verificationSubmissions.createdAt }).from(verificationSubmissions).leftJoin(dentists, eq(verificationSubmissions.dentistId, dentists.id)).leftJoin(clinics, eq(verificationSubmissions.clinicId, clinics.id)).where(condition).orderBy(desc(verificationSubmissions.createdAt));
      return rows.map(({ documents: raw, ...row }) => ({ ...row, subjectName: row.dentistName ?? row.clinicName ?? 'Unknown subject', documentCount: documents(raw).length }));
    },

    get: async (submissionId: string) => {
      const [row] = await database.select({ id: verificationSubmissions.id, subjectType: verificationSubmissions.subjectType, dentistId: verificationSubmissions.dentistId, clinicId: verificationSubmissions.clinicId, dentistName: sql<string | null>`concat(${dentists.firstName}, ' ', ${dentists.lastName})`, clinicName: clinics.name, status: verificationSubmissions.status, documents: verificationSubmissions.documents, reviewReason: verificationSubmissions.reviewReason, expiresAt: verificationSubmissions.expiresAt, reviewedAt: verificationSubmissions.reviewedAt, createdAt: verificationSubmissions.createdAt }).from(verificationSubmissions).leftJoin(dentists, eq(verificationSubmissions.dentistId, dentists.id)).leftJoin(clinics, eq(verificationSubmissions.clinicId, clinics.id)).where(eq(verificationSubmissions.id, submissionId)).limit(1);
      return row ? { ...row, subjectName: row.dentistName ?? row.clinicName ?? 'Unknown subject', documents: documents(row.documents).map(({ storageKey: _private, ...document }) => document) } : null;
    },

    download: async (submissionId: string, documentIndex: number) => {
      const [row] = await database.select({ documents: verificationSubmissions.documents }).from(verificationSubmissions).where(eq(verificationSubmissions.id, submissionId)).limit(1);
      const document = row ? documents(row.documents)[documentIndex] : undefined;
      if (!document) throw new VerificationError('DOCUMENT_NOT_FOUND', 'Verification document not found', 404);
      const result = await storage().downloadAsBytes(document.storageKey);
      if (!result.ok) throw new VerificationError('DOCUMENT_NOT_FOUND', 'Verification document is unavailable', 404);
      return { buffer: result.value[0], filename: document.filename, mimeType: document.mimeType };
    },

    review: async (submissionId: string, input: { status: 'approved' | 'rejected' | 'revoked'; reason: string; expiresAt?: string }, actor: VerificationActor) => database.transaction(async (tx) => {
      const [submission] = await tx.select().from(verificationSubmissions).where(eq(verificationSubmissions.id, submissionId)).limit(1).for('update');
      if (!submission) throw new VerificationError('SUBMISSION_NOT_FOUND', 'Verification submission not found', 404);
      if (input.status !== 'revoked' && submission.status !== 'pending') throw new VerificationError('ALREADY_REVIEWED', 'Only pending submissions can be approved or rejected', 409);
      if (input.status === 'revoked' && submission.status !== 'approved') throw new VerificationError('NOT_APPROVED', 'Only approved verifications can be revoked', 409);
      const [updated] = await tx.update(verificationSubmissions).set({ status: input.status, reviewReason: input.reason, reviewedBy: actor.id, reviewedAt: new Date(), expiresAt: input.status === 'approved' && input.expiresAt ? new Date(input.expiresAt) : submission.expiresAt, updatedAt: new Date() }).where(eq(verificationSubmissions.id, submissionId)).returning();
      if (submission.dentistId) await tx.update(dentists).set({ verificationStatus: input.status === 'approved' ? 'verified' : 'unverified' }).where(eq(dentists.id, submission.dentistId));
      if (submission.clinicId) await tx.update(clinics).set({ verificationStatus: input.status === 'approved' ? 'verified' : 'unverified' }).where(eq(clinics.id, submission.clinicId));
      await writeAudit(tx as unknown as DB, { actorId: actor.id, actorEmail: actor.email, clinicId: submission.clinicId, entityType: 'verification_submission', entityId: submissionId, action: input.status === 'approved' ? AuditAction.VERIFICATION_APPROVED : input.status === 'revoked' ? AuditAction.VERIFICATION_REVOKED : AuditAction.VERIFICATION_REJECTED, metadata: JSON.stringify({ subjectType: submission.subjectType, reason: input.reason }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      if (notifications && submission.dentistId) {
        const [profile] = await tx.select({ firstName: dentists.firstName, lastName: dentists.lastName, email: dentists.email })
          .from(dentists)
          .where(eq(dentists.id, submission.dentistId))
          .limit(1);
        let recipient = profile?.email ?? null;
        if (!recipient) {
          const [linkedUser] = await tx.select({ email: users.email })
            .from(clinicMemberships)
            .innerJoin(users, eq(users.id, clinicMemberships.userId))
            .where(and(eq(clinicMemberships.dentistId, submission.dentistId), eq(clinicMemberships.isActive, 'true')))
            .limit(1);
          recipient = linkedUser?.email ?? null;
        }
        if (profile && recipient) {
          await notifications.enqueue(tx as unknown as DB, dentistVerificationNotification({
            dentistName: `${profile.firstName} ${profile.lastName}`,
            recipient,
            status: input.status,
            reason: input.reason,
            dedupeKey: `verification:${submissionId}:${input.status}`,
          }));
        }
      }
      return updated;
    }),
  };
}
