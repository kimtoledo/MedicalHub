import { createHash } from 'node:crypto';
import { and, avg, count, desc, eq, gte, inArray, isNull, notExists, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { appointments, clinicReviews, clinics, dentists, patientPortalLinks, patientPortalSessions, reviewReports, services } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';

export type ReviewService = ReturnType<typeof createReviewService>;
export class ReviewError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
type Actor = { id: string; email: string; ipAddress?: string; userAgent?: string };

export function createReviewService(database: DB) {
  const currentAccount = async (token: string | undefined) => {
    if (!token) return null;
    const hash = createHash('sha256').update(token).digest('hex');
    const [row] = await database.select({ accountId: patientPortalSessions.accountId }).from(patientPortalSessions).where(and(eq(patientPortalSessions.tokenHash, hash), gte(patientPortalSessions.expiresAt, new Date()))).limit(1);
    return row?.accountId ?? null;
  };

  return {
    eligible: async (token: string | undefined) => {
      const accountId = await currentAccount(token); if (!accountId) throw new ReviewError('UNAUTHENTICATED', 'Patient sign-in is required', 401);
      return database.select({ appointmentId: appointments.id, clinicId: appointments.clinicId, clinicName: clinics.name, dentistId: appointments.dentistId, dentistFirstName: dentists.firstName, dentistLastName: dentists.lastName, serviceName: services.name, startsAt: appointments.startsAt }).from(patientPortalLinks).innerJoin(appointments, and(eq(patientPortalLinks.patientId, appointments.patientId), eq(patientPortalLinks.clinicId, appointments.clinicId))).innerJoin(clinics, eq(appointments.clinicId, clinics.id)).leftJoin(dentists, eq(appointments.dentistId, dentists.id)).leftJoin(services, eq(appointments.serviceId, services.id)).where(and(eq(patientPortalLinks.accountId, accountId), isNull(patientPortalLinks.revokedAt), eq(appointments.status, 'completed'), notExists(database.select({ id: clinicReviews.id }).from(clinicReviews).where(eq(clinicReviews.appointmentId, appointments.id))))).orderBy(desc(appointments.startsAt));
    },

    mine: async (token: string | undefined) => {
      const accountId = await currentAccount(token); if (!accountId) throw new ReviewError('UNAUTHENTICATED', 'Patient sign-in is required', 401);
      return database.select({ id: clinicReviews.id, clinicId: clinicReviews.clinicId, clinicName: clinics.name, rating: clinicReviews.rating, comment: clinicReviews.comment, status: clinicReviews.status, moderationReason: clinicReviews.moderationReason, response: clinicReviews.response, responseAt: clinicReviews.responseAt, createdAt: clinicReviews.createdAt }).from(clinicReviews).innerJoin(clinics, eq(clinicReviews.clinicId, clinics.id)).where(eq(clinicReviews.accountId, accountId)).orderBy(desc(clinicReviews.createdAt));
    },

    submit: async (token: string | undefined, input: { clinicId: string; appointmentId: string; rating: number; comment: string }) => {
      const accountId = await currentAccount(token); if (!accountId) throw new ReviewError('UNAUTHENTICATED', 'Patient sign-in is required', 401);
      const [appointment] = await database.select({ id: appointments.id, patientId: appointments.patientId, dentistId: appointments.dentistId }).from(appointments).where(and(eq(appointments.id, input.appointmentId), eq(appointments.clinicId, input.clinicId), eq(appointments.status, 'completed'))).limit(1);
      if (!appointment?.patientId) throw new ReviewError('APPOINTMENT_NOT_ELIGIBLE', 'Only completed appointments can be reviewed', 409);
      const [link, existing] = await Promise.all([
        database.select({ patientId: patientPortalLinks.patientId }).from(patientPortalLinks).where(and(eq(patientPortalLinks.accountId, accountId), eq(patientPortalLinks.clinicId, input.clinicId), eq(patientPortalLinks.patientId, appointment.patientId), isNull(patientPortalLinks.revokedAt))).limit(1),
        database.select({ id: clinicReviews.id }).from(clinicReviews).where(eq(clinicReviews.appointmentId, input.appointmentId)).limit(1),
      ]);
      if (!link[0]) throw new ReviewError('CLINIC_NOT_LINKED', 'This clinic record is not linked to the patient account', 403);
      if (existing[0]) throw new ReviewError('REVIEW_EXISTS', 'This appointment has already been reviewed', 409);
      const [created] = await database.insert(clinicReviews).values({ clinicId: input.clinicId, dentistId: appointment.dentistId, appointmentId: input.appointmentId, patientId: appointment.patientId, accountId, rating: input.rating, comment: input.comment.trim() }).returning({ id: clinicReviews.id });
      return created;
    },

    listPublic: async (clinicId: string | undefined, dentistId: string | undefined, page: number, pageSize: number) => {
      const condition = and(clinicId ? eq(clinicReviews.clinicId, clinicId) : undefined, eq(clinicReviews.status, 'approved'), dentistId ? eq(clinicReviews.dentistId, dentistId) : undefined);
      const [rows, summary] = await Promise.all([
        database.select({ id: clinicReviews.id, rating: clinicReviews.rating, comment: clinicReviews.comment, response: clinicReviews.response, responseAt: clinicReviews.responseAt, createdAt: clinicReviews.createdAt }).from(clinicReviews).where(condition).orderBy(desc(clinicReviews.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
        database.select({ average: avg(clinicReviews.rating), total: count(clinicReviews.id) }).from(clinicReviews).where(condition),
      ]);
      const total = Number(summary[0]?.total ?? 0);
      return { reviews: rows.map((row) => ({ ...row, author: 'Verified patient' })), averageRating: Number(summary[0]?.average ?? 0), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
    },

    listClinic: async (clinicId: string) => database.select({ id: clinicReviews.id, rating: clinicReviews.rating, comment: clinicReviews.comment, response: clinicReviews.response, responseAt: clinicReviews.responseAt, status: clinicReviews.status, createdAt: clinicReviews.createdAt }).from(clinicReviews).where(and(eq(clinicReviews.clinicId, clinicId), eq(clinicReviews.status, 'approved'))).orderBy(desc(clinicReviews.createdAt)),

    listModeration: async (status: 'all' | 'pending' | 'approved' | 'rejected' | 'hidden' | 'reported') => {
      const reportCount = sql<number>`(select count(*) from ${reviewReports} where ${reviewReports.reviewId} = ${clinicReviews.id} and ${reviewReports.status} = 'pending')`;
      const rows = await database.select({ id: clinicReviews.id, clinicId: clinicReviews.clinicId, clinicName: clinics.name, dentistId: clinicReviews.dentistId, rating: clinicReviews.rating, comment: clinicReviews.comment, status: clinicReviews.status, moderationReason: clinicReviews.moderationReason, createdAt: clinicReviews.createdAt, reportCount }).from(clinicReviews).innerJoin(clinics, eq(clinicReviews.clinicId, clinics.id)).where(status === 'all' ? undefined : status === 'reported' ? sql`${reportCount} > 0` : eq(clinicReviews.status, status)).orderBy(desc(clinicReviews.createdAt));
      if (!rows.length) return rows.map((row) => ({ ...row, reports: [] }));
      const reports = await database.select({ reviewId: reviewReports.reviewId, reason: reviewReports.reason, details: reviewReports.details, createdAt: reviewReports.createdAt }).from(reviewReports).where(and(inArray(reviewReports.reviewId, rows.map((row) => row.id)), eq(reviewReports.status, 'pending'))).orderBy(desc(reviewReports.createdAt));
      return rows.map((row) => ({ ...row, reports: reports.filter((report) => report.reviewId === row.id) }));
    },

    report: async (token: string | undefined, reviewId: string, input: { reason: string; details?: string }) => {
      const accountId = await currentAccount(token); if (!accountId) throw new ReviewError('UNAUTHENTICATED', 'Patient sign-in is required', 401);
      const [review] = await database.select({ id: clinicReviews.id }).from(clinicReviews).where(and(eq(clinicReviews.id, reviewId), eq(clinicReviews.status, 'approved'))).limit(1);
      if (!review) throw new ReviewError('REVIEW_NOT_FOUND', 'Approved review not found', 404);
      const [existing] = await database.select({ id: reviewReports.id }).from(reviewReports).where(and(eq(reviewReports.reviewId, reviewId), eq(reviewReports.accountId, accountId))).limit(1);
      if (existing) throw new ReviewError('REPORT_EXISTS', 'You already reported this review', 409);
      const [created] = await database.insert(reviewReports).values({ reviewId, accountId, reason: input.reason, details: input.details?.trim() ?? null }).returning({ id: reviewReports.id }); return created;
    },

    moderate: async (reviewId: string, input: { status: 'approved' | 'rejected' | 'hidden'; reason: string }, actor: Actor) => database.transaction(async (tx) => {
      const [current] = await tx.select({ id: clinicReviews.id, clinicId: clinicReviews.clinicId, status: clinicReviews.status }).from(clinicReviews).where(eq(clinicReviews.id, reviewId)).limit(1).for('update');
      if (!current) throw new ReviewError('REVIEW_NOT_FOUND', 'Review not found', 404);
      if (current.status !== 'pending' && input.status !== 'hidden') throw new ReviewError('ALREADY_MODERATED', 'Only pending reviews can be approved or rejected', 409);
      const [updated] = await tx.update(clinicReviews).set({ status: input.status, moderationReason: input.reason, moderatedBy: actor.id, moderatedAt: new Date(), updatedAt: new Date() }).where(eq(clinicReviews.id, reviewId)).returning({ id: clinicReviews.id, clinicId: clinicReviews.clinicId, status: clinicReviews.status });
      if (input.status === 'hidden') await tx.update(reviewReports).set({ status: 'resolved', updatedAt: new Date() }).where(and(eq(reviewReports.reviewId, reviewId), eq(reviewReports.status, 'pending')));
      await writeAudit(tx as unknown as DB, { actorId: actor.id, actorEmail: actor.email, clinicId: updated.clinicId, entityType: 'clinic_review', entityId: reviewId, action: AuditAction.REVIEW_MODERATED, metadata: JSON.stringify({ status: input.status, reason: input.reason }), ipAddress: actor.ipAddress, userAgent: actor.userAgent }); return updated;
    }),

    respond: async (clinicId: string, reviewId: string, response: string, actor: Actor) => database.transaction(async (tx) => {
      const [current] = await tx.select({ id: clinicReviews.id, response: clinicReviews.response }).from(clinicReviews).where(and(eq(clinicReviews.id, reviewId), eq(clinicReviews.clinicId, clinicId), eq(clinicReviews.status, 'approved'))).limit(1).for('update');
      if (!current) throw new ReviewError('REVIEW_NOT_FOUND', 'Approved review not found', 404);
      if (current.response) throw new ReviewError('RESPONSE_EXISTS', 'This review already has a clinic response', 409);
      const [updated] = await tx.update(clinicReviews).set({ response: response.trim(), responseAt: new Date(), updatedAt: new Date() }).where(eq(clinicReviews.id, reviewId)).returning({ id: clinicReviews.id });
      await writeAudit(tx as unknown as DB, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'clinic_review', entityId: reviewId, action: AuditAction.REVIEW_RESPONDED, metadata: JSON.stringify({ responseLength: response.length }), ipAddress: actor.ipAddress, userAgent: actor.userAgent }); return updated;
    }),
  };
}
