import { and, asc, count, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { appointments, branches, clinics, dentists, encounters, patientDentalHistories, patientMedicalHistories, patients, services, users } from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';

export type PatientActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export type PatientCreateInput = { firstName: string; lastName: string; middleName?: string; dateOfBirth?: string; sex?: string; civilStatus?: string; occupation?: string; nationality?: string; phone?: string; email?: string; address?: string; city?: string; province?: string; emergencyContactName?: string; emergencyContactPhone?: string; emergencyContactRelation?: string; guardianName?: string; guardianPhone?: string; guardianRelation?: string; notes?: string };
export type MedicalHistoryInput = { allergies?: string; currentMedications?: string; majorConditions?: string; isPregnant?: string; physicianName?: string; physicianPhone?: string; notes?: string };
export type DentalHistoryInput = { lastDentalVisit?: string; previousTreatments?: string; hasSensitivity?: string; hasBleedingGums?: string; hasPain?: string; oralHabits?: string; orthodonticHistory?: string; chiefConcerns?: string; notes?: string };
export type ClinicPatientsService = {
  list: (clinicId: string, input: { search: string; page: number; pageSize: number }) => Promise<{ items: Array<Record<string, unknown>>; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>;
  create: (clinicId: string, input: PatientCreateInput, actor: PatientActor) => Promise<{ id: string; patientNumber: string }>;
  detail: (clinicId: string, patientId: string, sort: 'asc' | 'desc') => Promise<Record<string, unknown> | null>;
  addMedicalHistory: (clinicId: string, patientId: string, input: MedicalHistoryInput, actor: PatientActor) => Promise<{ id: string; createdAt: Date }>;
  addDentalHistory: (clinicId: string, patientId: string, input: DentalHistoryInput, actor: PatientActor) => Promise<{ id: string; createdAt: Date }>;
};
export class ClinicPatientError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }

const appointmentSelection = { id: appointments.id, status: appointments.status, startsAt: appointments.startsAt, endsAt: appointments.endsAt, dentistFirstName: dentists.firstName, dentistLastName: dentists.lastName, serviceName: services.name, branchName: branches.name, encounterId: encounters.id };

export function createClinicPatientsService(database: DB): ClinicPatientsService {
  const ensurePatient = async (clinicId: string, patientId: string) => { const [patient] = await database.select({ id: patients.id }).from(patients).where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId), isNull(patients.deletedAt))).limit(1); if (!patient) throw new ClinicPatientError('PATIENT_NOT_FOUND', 'Patient not found', 404); };
  return {
    list: async (clinicId, input) => {
      const pattern = `%${input.search.trim()}%`; const where = and(eq(patients.clinicId, clinicId), isNull(patients.deletedAt), input.search ? or(ilike(patients.patientNumber, pattern), ilike(patients.firstName, pattern), ilike(patients.lastName, pattern), ilike(patients.phone, pattern)) : undefined);
      const [totalRow] = await database.select({ total: count(patients.id) }).from(patients).where(where); const total = totalRow?.total ?? 0; const totalPages = Math.max(1, Math.ceil(total / input.pageSize)); const page = Math.min(input.page, totalPages);
      const rows = await database.select({ id: patients.id, patientNumber: patients.patientNumber, firstName: patients.firstName, lastName: patients.lastName, middleName: patients.middleName, phone: patients.phone, email: patients.email, status: patients.status }).from(patients).where(where).orderBy(asc(patients.lastName), asc(patients.firstName)).limit(input.pageSize).offset((page - 1) * input.pageSize);
      const patientIds = rows.map((row) => row.id); const appointmentRows = patientIds.length ? await database.select({ patientId: appointments.patientId, startsAt: appointments.startsAt, status: appointments.status }).from(appointments).where(and(eq(appointments.clinicId, clinicId), inArray(appointments.patientId, patientIds))).orderBy(asc(appointments.startsAt)) : [];
      const now = Date.now(); const items = rows.map((row) => { const dates = appointmentRows.filter((item) => item.patientId === row.id); const past = dates.filter((item) => item.startsAt.getTime() < now); const upcoming = dates.filter((item) => item.startsAt.getTime() >= now && !['cancelled', 'no_show', 'rescheduled'].includes(item.status)); return { ...row, lastAppointment: past.at(-1)?.startsAt ?? null, nextAppointment: upcoming[0]?.startsAt ?? null }; });
      return { items, pagination: { page, pageSize: input.pageSize, total, totalPages } };
    },
    create: async (clinicId, input, actor) => database.transaction(async (transaction) => {
      const [clinic] = await transaction.select({ id: clinics.id, prefix: clinics.prefix }).from(clinics).where(and(eq(clinics.id, clinicId), inArray(clinics.status, ['trial', 'active']), isNull(clinics.deletedAt))).limit(1).for('update');
      if (!clinic) throw new ClinicPatientError('CLINIC_NOT_FOUND', 'Clinic not found', 404);
      const prefix = clinic.prefix.trim().toUpperCase(); if (!prefix) throw new ClinicPatientError('CLINIC_PREFIX_REQUIRED', 'Clinic patient-number prefix is not configured', 409);
      const existing = await transaction.select({ patientNumber: patients.patientNumber }).from(patients).where(eq(patients.clinicId, clinicId));
      const highest = existing.reduce((max, row) => { const match = row.patientNumber.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`)); return Math.max(max, match ? Number(match[1]) : 0); }, 0);
      const patientNumber = `${prefix}${String(highest + 1).padStart(6, '0')}`;
      const [created] = await transaction.insert(patients).values({ clinicId, patientNumber, ...input }).returning({ id: patients.id, patientNumber: patients.patientNumber });
      await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'patient', entityId: created.id, action: AuditAction.PATIENT_CREATED, metadata: JSON.stringify({ patientNumber: created.patientNumber }), ipAddress: actor.ipAddress, userAgent: actor.userAgent }); return created;
    }),
    detail: async (clinicId, patientId, sort) => {
      const [patient] = await database.select().from(patients).where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId), isNull(patients.deletedAt))).limit(1); if (!patient) return null;
      const order = sort === 'asc' ? asc(appointments.startsAt) : desc(appointments.startsAt);
      const [appointmentRows, medicalRows, dentalRows] = await Promise.all([
        database.select(appointmentSelection).from(appointments).leftJoin(dentists, eq(appointments.dentistId, dentists.id)).leftJoin(services, eq(appointments.serviceId, services.id)).innerJoin(branches, eq(appointments.branchId, branches.id)).leftJoin(encounters, and(eq(encounters.appointmentId, appointments.id), eq(encounters.clinicId, clinicId))).where(and(eq(appointments.clinicId, clinicId), eq(appointments.patientId, patientId))).orderBy(order),
        database.select({ id: patientMedicalHistories.id, allergies: patientMedicalHistories.allergies, currentMedications: patientMedicalHistories.currentMedications, majorConditions: patientMedicalHistories.majorConditions, isPregnant: patientMedicalHistories.isPregnant, physicianName: patientMedicalHistories.physicianName, physicianPhone: patientMedicalHistories.physicianPhone, notes: patientMedicalHistories.notes, recordedBy: patientMedicalHistories.recordedBy, recordedByName: users.name, createdAt: patientMedicalHistories.createdAt }).from(patientMedicalHistories).leftJoin(users, eq(patientMedicalHistories.recordedBy, users.id)).where(and(eq(patientMedicalHistories.clinicId, clinicId), eq(patientMedicalHistories.patientId, patientId))).orderBy(desc(patientMedicalHistories.createdAt)),
        database.select({ id: patientDentalHistories.id, lastDentalVisit: patientDentalHistories.lastDentalVisit, previousTreatments: patientDentalHistories.previousTreatments, hasSensitivity: patientDentalHistories.hasSensitivity, hasBleedingGums: patientDentalHistories.hasBleedingGums, hasPain: patientDentalHistories.hasPain, oralHabits: patientDentalHistories.oralHabits, orthodonticHistory: patientDentalHistories.orthodonticHistory, chiefConcerns: patientDentalHistories.chiefConcerns, notes: patientDentalHistories.notes, recordedBy: patientDentalHistories.recordedBy, recordedByName: users.name, createdAt: patientDentalHistories.createdAt }).from(patientDentalHistories).leftJoin(users, eq(patientDentalHistories.recordedBy, users.id)).where(and(eq(patientDentalHistories.clinicId, clinicId), eq(patientDentalHistories.patientId, patientId))).orderBy(desc(patientDentalHistories.createdAt)),
      ]);
      return { patient, appointments: appointmentRows, medicalHistory: { current: medicalRows[0] ?? null, versions: medicalRows }, dentalHistory: { current: dentalRows[0] ?? null, versions: dentalRows } };
    },
    addMedicalHistory: async (clinicId, patientId, input, actor) => { await ensurePatient(clinicId, patientId); return database.transaction(async (transaction) => { const [created] = await transaction.insert(patientMedicalHistories).values({ clinicId, patientId, ...input, recordedBy: actor.id }).returning({ id: patientMedicalHistories.id, createdAt: patientMedicalHistories.createdAt }); await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'patient_medical_history', entityId: created.id, action: AuditAction.MEDICAL_HISTORY_RECORDED, metadata: JSON.stringify({ patientId }), ipAddress: actor.ipAddress, userAgent: actor.userAgent }); return created; }); },
    addDentalHistory: async (clinicId, patientId, input, actor) => { await ensurePatient(clinicId, patientId); return database.transaction(async (transaction) => { const [created] = await transaction.insert(patientDentalHistories).values({ clinicId, patientId, ...input, recordedBy: actor.id }).returning({ id: patientDentalHistories.id, createdAt: patientDentalHistories.createdAt }); await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'patient_dental_history', entityId: created.id, action: AuditAction.DENTAL_HISTORY_RECORDED, metadata: JSON.stringify({ patientId }), ipAddress: actor.ipAddress, userAgent: actor.userAgent }); return created; }); },
  };
}
