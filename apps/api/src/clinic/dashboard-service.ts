import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  or,
} from "drizzle-orm";
import type { DB } from "@dentra/db";
import { writeAudit } from "@dentra/db/audit";
import {
  appointments,
  appointmentStatusHistory,
  branches,
  branchHours,
  clinicClosures,
  clinics,
  dentistBranchAssignments,
  dentistSchedules,
  dentistTimeOff,
  dentists,
  encounters,
  patients,
  services,
  treatmentRecords,
  users,
} from "@dentra/db/schema";
import { AuditAction, type AppointmentStatus } from "@dentra/shared";
import type { PatientActor } from "./patients-service.js";
import type { IntegrationService } from "../integrations/service.js";
import { appointmentCancelledNotification, type NotificationService } from "../notifications/service.js";
import {
  generatedSlots,
  isOnTimeOff,
  resolveBranchRange,
  resolveClosure,
  resolveDentistRange,
  withinDentistRange,
} from "../public/booking-service.js";

const activePatientStatus = ["active"];
const transitions: Record<string, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
};
export type AppointmentView = {
  id: string;
  branchId: string;
  branchName: string;
  patientId: string | null;
  patientFirstName: string;
  patientLastName: string;
  patientNumber: string | null;
  dentistId: string | null;
  dentistFirstName: string | null;
  dentistLastName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  serviceWorkflowMode: "quick" | "standard" | null;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  chiefComplaint: string | null;
};
export type AppointmentDetail = AppointmentView & {
  branchAddress: string | null;
  branchCity: string | null;
  branchProvince: string | null;
  patientPhone: string | null;
  patientEmail: string | null;
  notes: string | null;
  cancellationReason: string | null;
  confirmedAt: Date | null;
  checkedInAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedByName: string | null;
    reason: string | null;
    createdAt: Date;
  }>;
};
export type ClinicDashboardService = {
  appointmentAvailability: (
    clinicId: string,
    input: { branchId: string; dentistId: string; serviceId: string; date: string },
    dentistRestriction?: string,
  ) => Promise<{ durationMinutes: number; slots: Array<{ startsAt: string; endsAt: string }>; closedReason: string | null }>;
  appointmentOptions: (
    clinicId: string,
    branchId?: string,
    dentistRestriction?: string,
  ) => Promise<{
    branches: Array<{ id: string; name: string }>;
    dentists: Array<{ id: string; firstName: string; lastName: string; branchId: string }>;
    services: Array<{ id: string; name: string; durationMinutes: string; workflowMode: "quick" | "standard" }>;
  }>;
  createAppointment: (
    clinicId: string,
    input: {
      branchId: string;
      patientId: string;
      dentistId: string;
      serviceId: string;
      startsAt: string;
      notes?: string;
    },
    actor: PatientActor,
    dentistRestriction?: string,
  ) => Promise<{ id: string; status: "confirmed"; startsAt: Date; endsAt: Date }>;
  completeQuickService: (
    clinicId: string,
    appointmentId: string,
    input: { toothRef?: string; notes?: string; performedAt?: string },
    actor: PatientActor,
    dentistRestriction?: string,
  ) => Promise<{ appointmentId: string; encounterId: string; treatmentRecordId: string }>;
  summary: (
    clinicId: string,
    branchId: string | undefined,
    date: string,
  ) => Promise<{
    todayAppointmentCount: number;
    checkedInCount: number;
    upcomingCount: number;
    activePatientCount: number;
    appointments: AppointmentView[];
  }>;
  appointments: (
    clinicId: string,
    branchId: string | undefined,
    date: string,
    status?: string,
    dentistId?: string,
    endDate?: string,
    search?: string,
    serviceId?: string,
  ) => Promise<AppointmentView[]>;
  appointment: (
    clinicId: string,
    appointmentId: string,
    dentistRestriction?: string,
  ) => Promise<AppointmentDetail | null>;
  updateStatus: (
    clinicId: string,
    appointmentId: string,
    nextStatus: AppointmentStatus,
    actor: PatientActor,
    dentistRestriction?: string,
  ) => Promise<{ id: string; status: string }>;
  recentPatients: (
    clinicId: string,
    dentistId: string,
    branchId?: string,
  ) => Promise<
    Array<{
      patientId: string;
      patientNumber: string;
      firstName: string;
      lastName: string;
      serviceName: string | null;
      lastVisit: Date;
    }>
  >;
};
export class ClinicDashboardError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
  ) {
    super(message);
  }
}
function range(date: string, endDate?: string) {
  const start = new Date(`${date}T00:00:00+08:00`);
  const end = endDate
    ? new Date(new Date(`${endDate}T00:00:00+08:00`).getTime() + 86_400_000)
    : new Date(start.getTime() + 86_400_000);
  return { start, end };
}
const selection = {
  id: appointments.id,
  branchId: appointments.branchId,
  branchName: branches.name,
  patientId: appointments.patientId,
  patientFirstName: patients.firstName,
  patientLastName: patients.lastName,
  publicFirstName: appointments.patientFirstName,
  publicLastName: appointments.patientLastName,
  patientNumber: patients.patientNumber,
  dentistId: appointments.dentistId,
  dentistFirstName: dentists.firstName,
  dentistLastName: dentists.lastName,
  serviceId: appointments.serviceId,
  serviceName: services.name,
  serviceWorkflowMode: services.workflowMode,
  status: appointments.status,
  startsAt: appointments.startsAt,
  endsAt: appointments.endsAt,
  chiefComplaint: appointments.chiefComplaint,
};
function normalize(
  row: typeof selection extends never ? never : Record<string, unknown>,
): AppointmentView {
  const value = row as Record<string, any>;
  return {
    id: value.id,
    branchId: value.branchId,
    branchName: value.branchName,
    patientId: value.patientId,
    patientFirstName:
      value.patientFirstName ?? value.publicFirstName ?? "Walk-in",
    patientLastName: value.patientLastName ?? value.publicLastName ?? "Patient",
    patientNumber: value.patientNumber,
    dentistId: value.dentistId,
    dentistFirstName: value.dentistFirstName,
    dentistLastName: value.dentistLastName,
    serviceId: value.serviceId,
    serviceName: value.serviceName,
    serviceWorkflowMode: value.serviceWorkflowMode,
    status: value.status,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    chiefComplaint: value.chiefComplaint,
  };
}
export function createClinicDashboardService(
  database: DB,
  integrations?: IntegrationService,
  notifications?: NotificationService,
): ClinicDashboardService {
  const list = async (
    clinicId: string,
    branchId: string | undefined,
    date: string,
    status?: string,
    dentistId?: string,
    endDate?: string,
    search?: string,
    serviceId?: string,
  ) => {
    const { start, end } = range(date, endDate);
    const rows = await database
      .select(selection)
      .from(appointments)
      .innerJoin(branches, eq(appointments.branchId, branches.id))
      .leftJoin(
        patients,
        and(
          eq(appointments.patientId, patients.id),
          eq(patients.clinicId, clinicId),
        ),
      )
      .leftJoin(dentists, eq(appointments.dentistId, dentists.id))
      .leftJoin(
        services,
        and(
          eq(appointments.serviceId, services.id),
          eq(services.clinicId, clinicId),
        ),
      )
      .where(
        and(
          eq(appointments.clinicId, clinicId),
          branchId ? eq(appointments.branchId, branchId) : undefined,
          dentistId ? eq(appointments.dentistId, dentistId) : undefined,
          serviceId ? eq(appointments.serviceId, serviceId) : undefined,
          search ? or(ilike(patients.firstName, `%${search}%`), ilike(patients.lastName, `%${search}%`), ilike(patients.patientNumber, `%${search}%`), ilike(appointments.patientFirstName, `%${search}%`), ilike(appointments.patientLastName, `%${search}%`)) : undefined,
          status
            ? eq(appointments.status, status as AppointmentStatus)
            : undefined,
          gte(appointments.startsAt, start),
          lt(appointments.startsAt, end),
        ),
      )
      .orderBy(asc(appointments.startsAt));
    return rows.map((row) => normalize(row));
  };
  return {
    appointmentAvailability: async (clinicId, input, dentistRestriction) => {
      if (dentistRestriction && dentistRestriction !== input.dentistId) throw new ClinicDashboardError("FORBIDDEN", "Dentists may view only their own availability", 403);
      const [[branch], [service], [assignment]] = await Promise.all([
        database.select({ id: branches.id }).from(branches).where(and(eq(branches.id, input.branchId), eq(branches.clinicId, clinicId), eq(branches.isActive, true), isNull(branches.deletedAt))).limit(1),
        database.select({ id: services.id, durationMinutes: services.durationMinutes }).from(services).where(and(eq(services.id, input.serviceId), eq(services.clinicId, clinicId), eq(services.isActive, "true"))).limit(1),
        database.select({ id: dentistBranchAssignments.id }).from(dentistBranchAssignments).innerJoin(dentists, eq(dentists.id, dentistBranchAssignments.dentistId)).where(and(eq(dentistBranchAssignments.clinicId, clinicId), eq(dentistBranchAssignments.branchId, input.branchId), eq(dentistBranchAssignments.dentistId, input.dentistId), eq(dentistBranchAssignments.isActive, "true"), isNull(dentists.deletedAt))).limit(1),
      ]);
      if (!branch || !service || !assignment) throw new ClinicDashboardError("BOOKING_CONTEXT_UNAVAILABLE", "The selected branch, service, or dentist is unavailable", 404);
      const [hours, closures, schedules, timeOff] = await Promise.all([
        database.select({ weekday: branchHours.weekday, opensAt: branchHours.opensAt, closesAt: branchHours.closesAt, isClosed: branchHours.isClosed }).from(branchHours).where(eq(branchHours.branchId, input.branchId)),
        database.select({ branchId: clinicClosures.branchId, date: clinicClosures.date, label: clinicClosures.label, isEnabled: clinicClosures.isEnabled }).from(clinicClosures).where(eq(clinicClosures.clinicId, clinicId)),
        database.select({ dentistId: dentistSchedules.dentistId, branchId: dentistSchedules.branchId, weekday: dentistSchedules.weekday, startsAt: dentistSchedules.startsAt, endsAt: dentistSchedules.endsAt }).from(dentistSchedules).where(and(eq(dentistSchedules.branchId, input.branchId), eq(dentistSchedules.dentistId, input.dentistId))),
        database.select({ dentistId: dentistTimeOff.dentistId, startDate: dentistTimeOff.startDate, endDate: dentistTimeOff.endDate }).from(dentistTimeOff).where(eq(dentistTimeOff.dentistId, input.dentistId)),
      ]);
      const minutes = Number.parseInt(service.durationMinutes, 10); const durationMinutes = Number.isFinite(minutes) && minutes >= 15 && minutes <= 240 ? minutes : 30;
      const closedReason = resolveClosure(closures, input.branchId, input.date);
      if (closedReason) return { durationMinutes, slots: [], closedReason };
      if (isOnTimeOff(timeOff, input.dentistId, input.date)) return { durationMinutes, slots: [], closedReason: "Dentist unavailable" };
      const branchRange = resolveBranchRange(hours, input.date);
      const dentistRange = branchRange ? resolveDentistRange(schedules, input.dentistId, input.branchId, input.date, branchRange) : null;
      const generated = generatedSlots(branchRange, input.date, durationMinutes).filter((slot) => withinDentistRange(slot, input.date, dentistRange));
      if (!generated.length) return { durationMinutes, slots: [], closedReason: branchRange ? "No dentist availability" : "Clinic closed" };
      const dayStart = new Date(`${input.date}T00:00:00+08:00`); const dayEnd = new Date(`${input.date}T24:00:00+08:00`);
      const busy = await database.select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt }).from(appointments).where(and(eq(appointments.clinicId, clinicId), eq(appointments.dentistId, input.dentistId), inArray(appointments.status, ["pending", "confirmed", "checked_in", "in_progress"]), lt(appointments.startsAt, dayEnd), or(isNull(appointments.endsAt), gt(appointments.endsAt, dayStart))));
      return { durationMinutes, slots: generated.filter((slot) => !busy.some((item) => item.startsAt.getTime() < new Date(slot.endsAt).getTime() && (item.endsAt?.getTime() ?? Number.POSITIVE_INFINITY) > new Date(slot.startsAt).getTime())), closedReason: null };
    },
    appointmentOptions: async (clinicId, branchId, dentistRestriction) => {
      const [branchRows, dentistRows, serviceRows] = await Promise.all([
        database.select({ id: branches.id, name: branches.name }).from(branches).where(and(eq(branches.clinicId, clinicId), branchId ? eq(branches.id, branchId) : undefined, eq(branches.isActive, true), isNull(branches.deletedAt))).orderBy(asc(branches.name)),
        database.select({ id: dentists.id, firstName: dentists.firstName, lastName: dentists.lastName, branchId: dentistBranchAssignments.branchId }).from(dentistBranchAssignments).innerJoin(dentists, eq(dentists.id, dentistBranchAssignments.dentistId)).where(and(eq(dentistBranchAssignments.clinicId, clinicId), branchId ? eq(dentistBranchAssignments.branchId, branchId) : undefined, dentistRestriction ? eq(dentists.id, dentistRestriction) : undefined, eq(dentistBranchAssignments.isActive, "true"), isNull(dentists.deletedAt))).orderBy(asc(dentists.lastName), asc(dentists.firstName)),
        database.select({ id: services.id, name: services.name, durationMinutes: services.durationMinutes, workflowMode: services.workflowMode }).from(services).where(and(eq(services.clinicId, clinicId), eq(services.isActive, "true"))).orderBy(asc(services.name)),
      ]);
      return { branches: branchRows, dentists: dentistRows, services: serviceRows };
    },
    createAppointment: async (clinicId, input, actor, dentistRestriction) => {
      if (dentistRestriction && dentistRestriction !== input.dentistId) {
        throw new ClinicDashboardError("FORBIDDEN", "Dentists may create appointments only for themselves", 403);
      }
      const startsAt = new Date(input.startsAt);
      if (Number.isNaN(startsAt.getTime())) throw new ClinicDashboardError("INVALID_SLOT", "Appointment time is invalid");
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(startsAt);
      const created = await database.transaction(async (transaction) => {
        const [[branch], [patient], [service], [assignment]] = await Promise.all([
          transaction.select({ id: branches.id }).from(branches).where(and(eq(branches.id, input.branchId), eq(branches.clinicId, clinicId), eq(branches.isActive, true), isNull(branches.deletedAt))).limit(1),
          transaction.select({ id: patients.id }).from(patients).where(and(eq(patients.id, input.patientId), eq(patients.clinicId, clinicId), inArray(patients.status, activePatientStatus), isNull(patients.deletedAt))).limit(1),
          transaction.select({ id: services.id, durationMinutes: services.durationMinutes }).from(services).where(and(eq(services.id, input.serviceId), eq(services.clinicId, clinicId), eq(services.isActive, "true"))).limit(1),
          transaction.select({ id: dentistBranchAssignments.id }).from(dentistBranchAssignments).innerJoin(dentists, eq(dentists.id, dentistBranchAssignments.dentistId)).where(and(eq(dentistBranchAssignments.clinicId, clinicId), eq(dentistBranchAssignments.branchId, input.branchId), eq(dentistBranchAssignments.dentistId, input.dentistId), eq(dentistBranchAssignments.isActive, "true"), isNull(dentists.deletedAt))).limit(1).for("update"),
        ]);
        if (!branch) throw new ClinicDashboardError("BRANCH_NOT_FOUND", "Branch is unavailable", 404);
        if (!patient) throw new ClinicDashboardError("PATIENT_NOT_FOUND", "Patient is unavailable", 404);
        if (!service) throw new ClinicDashboardError("SERVICE_NOT_FOUND", "Service is unavailable", 404);
        if (!assignment) throw new ClinicDashboardError("DENTIST_UNAVAILABLE", "Dentist is not assigned to this branch", 409);

        const [hours, closures, schedules, timeOff] = await Promise.all([
          transaction.select({ weekday: branchHours.weekday, opensAt: branchHours.opensAt, closesAt: branchHours.closesAt, isClosed: branchHours.isClosed }).from(branchHours).where(eq(branchHours.branchId, input.branchId)),
          transaction.select({ branchId: clinicClosures.branchId, date: clinicClosures.date, label: clinicClosures.label, isEnabled: clinicClosures.isEnabled }).from(clinicClosures).where(eq(clinicClosures.clinicId, clinicId)),
          transaction.select({ dentistId: dentistSchedules.dentistId, branchId: dentistSchedules.branchId, weekday: dentistSchedules.weekday, startsAt: dentistSchedules.startsAt, endsAt: dentistSchedules.endsAt }).from(dentistSchedules).where(and(eq(dentistSchedules.branchId, input.branchId), eq(dentistSchedules.dentistId, input.dentistId))),
          transaction.select({ dentistId: dentistTimeOff.dentistId, startDate: dentistTimeOff.startDate, endDate: dentistTimeOff.endDate }).from(dentistTimeOff).where(eq(dentistTimeOff.dentistId, input.dentistId)),
        ]);
        const closedReason = resolveClosure(closures, input.branchId, date);
        if (closedReason) throw new ClinicDashboardError("CLINIC_CLOSED", `The clinic is closed on this date (${closedReason})`, 409);
        if (isOnTimeOff(timeOff, input.dentistId, date)) throw new ClinicDashboardError("DENTIST_UNAVAILABLE", "Dentist is unavailable on this date", 409);
        const minutes = Number.parseInt(service.durationMinutes, 10);
        const durationMinutes = Number.isFinite(minutes) && minutes >= 15 && minutes <= 240 ? minutes : 30;
        const branchRange = resolveBranchRange(hours, date);
        const requested = generatedSlots(branchRange, date, durationMinutes).find((slot) => new Date(slot.startsAt).getTime() === startsAt.getTime());
        if (!requested) throw new ClinicDashboardError("INVALID_SLOT", "Appointment time is outside current operating hours or is in the past", 409);
        const dentistRange = branchRange ? resolveDentistRange(schedules, input.dentistId, input.branchId, date, branchRange) : null;
        if (!withinDentistRange(requested, date, dentistRange)) throw new ClinicDashboardError("DENTIST_UNAVAILABLE", "Dentist is not scheduled for this time", 409);
        const endsAt = new Date(requested.endsAt);
        const [conflict] = await transaction.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.clinicId, clinicId), eq(appointments.dentistId, input.dentistId), inArray(appointments.status, ["pending", "confirmed", "checked_in", "in_progress"]), lt(appointments.startsAt, endsAt), or(isNull(appointments.endsAt), gt(appointments.endsAt, startsAt)))).limit(1);
        if (conflict) throw new ClinicDashboardError("SLOT_CONFLICT", "That time is already booked for this dentist", 409);
        const [appointment] = await transaction.insert(appointments).values({ clinicId, branchId: input.branchId, patientId: input.patientId, dentistId: input.dentistId, serviceId: input.serviceId, startsAt, endsAt, status: "confirmed", notes: input.notes || null, bookedBy: actor.id, confirmedAt: new Date() }).returning({ id: appointments.id, startsAt: appointments.startsAt, endsAt: appointments.endsAt });
        await transaction.insert(appointmentStatusHistory).values({ appointmentId: appointment.id, clinicId, fromStatus: null, toStatus: "confirmed", changedBy: actor.id, reason: "Created by clinic" });
        await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: "appointment", entityId: appointment.id, action: AuditAction.APPOINTMENT_CREATED, metadata: JSON.stringify({ source: "clinic", branchId: input.branchId, serviceId: input.serviceId, dentistId: input.dentistId, patientId: input.patientId }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        return { id: appointment.id, status: "confirmed" as const, startsAt: appointment.startsAt, endsAt: appointment.endsAt! };
      });
      integrations?.dispatchEvent(clinicId, "appointment.created", { appointmentId: created.id, startsAt: created.startsAt.toISOString() });
      return created;
    },
    completeQuickService: async (clinicId, appointmentId, input, actor, dentistRestriction) => {
      const performedAt = input.performedAt ? new Date(input.performedAt) : new Date();
      if (Number.isNaN(performedAt.getTime())) throw new ClinicDashboardError("INVALID_COMPLETION_TIME", "Completion time is invalid");
      if (performedAt.getTime() > Date.now() + 5 * 60_000) throw new ClinicDashboardError("INVALID_COMPLETION_TIME", "Completion time cannot be in the future");
      const result = await database.transaction(async (transaction) => {
        const [current] = await transaction.select({ id: appointments.id, status: appointments.status, branchId: appointments.branchId, patientId: appointments.patientId, dentistId: appointments.dentistId, serviceId: appointments.serviceId, serviceName: services.name, workflowMode: services.workflowMode }).from(appointments).leftJoin(services, and(eq(services.id, appointments.serviceId), eq(services.clinicId, clinicId))).where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, clinicId))).limit(1).for("update");
        if (!current) throw new ClinicDashboardError("APPOINTMENT_NOT_FOUND", "Appointment not found", 404);
        if (dentistRestriction && current.dentistId !== dentistRestriction) throw new ClinicDashboardError("FORBIDDEN", "Dentists may complete only their own appointments", 403);
        if (!current.patientId) throw new ClinicDashboardError("PATIENT_LINK_REQUIRED", "Link this appointment to a clinic patient before recording treatment", 409);
        if (!current.dentistId) throw new ClinicDashboardError("DENTIST_REQUIRED", "Assign a dentist before recording treatment", 409);
        if (!current.serviceId || current.workflowMode !== "quick") throw new ClinicDashboardError("QUICK_SERVICE_REQUIRED", "This appointment does not use a quick service", 409);
        if (!["confirmed", "checked_in", "in_progress"].includes(current.status)) throw new ClinicDashboardError("INVALID_STATUS_TRANSITION", `Cannot complete a quick service from ${current.status}`, 409);
        const [existingEncounter] = await transaction.select({ id: encounters.id }).from(encounters).where(and(eq(encounters.clinicId, clinicId), eq(encounters.appointmentId, appointmentId))).limit(1);
        if (existingEncounter) throw new ClinicDashboardError("ENCOUNTER_EXISTS", "This appointment already has an encounter", 409);
        const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(performedAt);
        const [encounter] = await transaction.insert(encounters).values({ clinicId, branchId: current.branchId, patientId: current.patientId, dentistId: current.dentistId, appointmentId, date, procedures: current.serviceName ?? "Quick dental service", notes: input.notes || null, status: "final", createdBy: actor.id }).returning({ id: encounters.id });
        const [treatment] = await transaction.insert(treatmentRecords).values({ clinicId, encounterId: encounter.id, patientId: current.patientId, serviceId: current.serviceId, toothRef: input.toothRef || null, notes: input.notes || null, performedBy: current.dentistId, performedAt }).returning({ id: treatmentRecords.id });
        const [updated] = await transaction.update(appointments).set({ status: "completed", completedAt: performedAt, updatedAt: new Date() }).where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, clinicId), eq(appointments.status, current.status))).returning({ id: appointments.id });
        if (!updated) throw new ClinicDashboardError("APPOINTMENT_CONFLICT", "Appointment changed before it could be completed", 409);
        await transaction.insert(appointmentStatusHistory).values({ appointmentId, clinicId, fromStatus: current.status, toStatus: "completed", changedBy: actor.id, reason: "Quick service completed" });
        await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: "encounter", entityId: encounter.id, action: AuditAction.ENCOUNTER_CREATED, metadata: JSON.stringify({ patientId: current.patientId, branchId: current.branchId, appointmentId, status: "final", source: "quick_service" }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: "encounter", entityId: encounter.id, action: AuditAction.ENCOUNTER_FINALIZED, metadata: JSON.stringify({ fromStatus: "draft", toStatus: "final", source: "quick_service" }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: "treatment_record", entityId: treatment.id, action: AuditAction.TREATMENT_RECORDED, metadata: JSON.stringify({ encounterId: encounter.id, patientId: current.patientId, serviceId: current.serviceId, source: "quick_service" }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        await writeAudit(transaction, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: "appointment", entityId: appointmentId, action: AuditAction.APPOINTMENT_STATUS_CHANGED, metadata: JSON.stringify({ fromStatus: current.status, toStatus: "completed", source: "quick_service" }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        return { appointmentId, encounterId: encounter.id, treatmentRecordId: treatment.id, fromStatus: current.status };
      });
      integrations?.dispatchEvent(clinicId, "appointment.updated", { appointmentId, fromStatus: result.fromStatus, toStatus: "completed" });
      return { appointmentId: result.appointmentId, encounterId: result.encounterId, treatmentRecordId: result.treatmentRecordId };
    },
    appointments: list,
    appointment: async (clinicId, appointmentId, dentistRestriction) => {
      const [row] = await database
        .select({
          ...selection,
          branchAddress: branches.address,
          branchCity: branches.city,
          branchProvince: branches.province,
          patientPhone: appointments.patientPhone,
          patientEmail: appointments.patientEmail,
          notes: appointments.notes,
          cancellationReason: appointments.cancellationReason,
          confirmedAt: appointments.confirmedAt,
          checkedInAt: appointments.checkedInAt,
          completedAt: appointments.completedAt,
          cancelledAt: appointments.cancelledAt,
        })
        .from(appointments)
        .innerJoin(branches, eq(appointments.branchId, branches.id))
        .leftJoin(
          patients,
          and(
            eq(appointments.patientId, patients.id),
            eq(patients.clinicId, clinicId),
          ),
        )
        .leftJoin(dentists, eq(appointments.dentistId, dentists.id))
        .leftJoin(
          services,
          and(
            eq(appointments.serviceId, services.id),
            eq(services.clinicId, clinicId),
          ),
        )
        .where(
          and(
            eq(appointments.id, appointmentId),
            eq(appointments.clinicId, clinicId),
            dentistRestriction
              ? eq(appointments.dentistId, dentistRestriction)
              : undefined,
          ),
        )
        .limit(1);
      if (!row) return null;
      const history = await database
        .select({
          id: appointmentStatusHistory.id,
          fromStatus: appointmentStatusHistory.fromStatus,
          toStatus: appointmentStatusHistory.toStatus,
          changedByName: users.name,
          reason: appointmentStatusHistory.reason,
          createdAt: appointmentStatusHistory.createdAt,
        })
        .from(appointmentStatusHistory)
        .leftJoin(users, eq(appointmentStatusHistory.changedBy, users.id))
        .where(eq(appointmentStatusHistory.appointmentId, appointmentId))
        .orderBy(asc(appointmentStatusHistory.createdAt));
      const extra = row as unknown as Record<string, unknown>;
      return {
        ...normalize(row),
        branchAddress: extra.branchAddress as string | null,
        branchCity: extra.branchCity as string | null,
        branchProvince: extra.branchProvince as string | null,
        patientPhone: extra.patientPhone as string | null,
        patientEmail: extra.patientEmail as string | null,
        notes: extra.notes as string | null,
        cancellationReason: extra.cancellationReason as string | null,
        confirmedAt: extra.confirmedAt as Date | null,
        checkedInAt: extra.checkedInAt as Date | null,
        completedAt: extra.completedAt as Date | null,
        cancelledAt: extra.cancelledAt as Date | null,
        statusHistory: history,
      };
    },
    summary: async (clinicId, branchId, date) => {
      const rows = await list(clinicId, branchId, date);
      const [{ total }] = await database
        .select({ total: count(patients.id) })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            inArray(patients.status, activePatientStatus),
            isNull(patients.deletedAt),
          ),
        );
      const now = Date.now();
      return {
        todayAppointmentCount: rows.length,
        checkedInCount: rows.filter((row) => row.status === "checked_in")
          .length,
        upcomingCount: rows.filter(
          (row) =>
            row.startsAt.getTime() >= now &&
            ["pending", "confirmed"].includes(row.status),
        ).length,
        activePatientCount: total ?? 0,
        appointments: rows,
      };
    },
    updateStatus: async (
      clinicId,
      appointmentId,
      nextStatus,
      actor,
      dentistRestriction,
    ) => {
      const result = await database.transaction(async (transaction) => {
        const [current] = await transaction
          .select({
            id: appointments.id,
            status: appointments.status,
            dentistId: appointments.dentistId,
            branchId: appointments.branchId,
            patientEmail: appointments.patientEmail,
            startsAt: appointments.startsAt,
          })
          .from(appointments)
          .where(
            and(
              eq(appointments.id, appointmentId),
              eq(appointments.clinicId, clinicId),
            ),
          )
          .limit(1)
          .for("update");
        if (!current)
          throw new ClinicDashboardError(
            "APPOINTMENT_NOT_FOUND",
            "Appointment not found",
            404,
          );
        if (dentistRestriction && current.dentistId !== dentistRestriction)
          throw new ClinicDashboardError(
            "FORBIDDEN",
            "Dentists may update only their own appointments",
            403,
          );
        if (!transitions[current.status]?.includes(nextStatus))
          throw new ClinicDashboardError(
            "INVALID_STATUS_TRANSITION",
            `Cannot change ${current.status} to ${nextStatus}`,
            409,
          );
        const timestamps =
          nextStatus === "checked_in"
            ? { checkedInAt: new Date() }
            : nextStatus === "completed"
              ? { completedAt: new Date() }
              : nextStatus === "cancelled"
                ? { cancelledAt: new Date() }
                : {};
        const [updated] = await transaction
          .update(appointments)
          .set({ status: nextStatus, ...timestamps })
          .where(
            and(
              eq(appointments.id, appointmentId),
              eq(appointments.clinicId, clinicId),
              eq(appointments.status, current.status),
            ),
          )
          .returning({ id: appointments.id, status: appointments.status });
        if (!updated)
          throw new ClinicDashboardError(
            "APPOINTMENT_CONFLICT",
            "Appointment changed before it could be updated",
            409,
          );
        await transaction
          .insert(appointmentStatusHistory)
          .values({
            appointmentId,
            clinicId,
            fromStatus: current.status,
            toStatus: nextStatus,
            changedBy: actor.id,
          });
        await writeAudit(transaction, {
            actorId: actor.id,
            actorEmail: actor.email,
            clinicId,
            entityType: "appointment",
            entityId: appointmentId,
            action:
              nextStatus === "cancelled"
                ? AuditAction.APPOINTMENT_CANCELLED
                : AuditAction.APPOINTMENT_STATUS_CHANGED,
            metadata: JSON.stringify({
              fromStatus: current.status,
              toStatus: nextStatus,
            }),
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent,
        });
        return { updated, fromStatus: current.status, patientEmail: current.patientEmail, startsAt: current.startsAt, branchId: current.branchId };
      });
      integrations?.dispatchEvent(clinicId, "appointment.updated", {
        appointmentId,
        fromStatus: result.fromStatus,
        toStatus: result.updated.status,
      });
      if (nextStatus === "cancelled" && notifications && result.patientEmail) {
        const [names] = await database
          .select({ clinicName: clinics.name, branchName: branches.name })
          .from(clinics)
          .innerJoin(branches, eq(branches.id, result.branchId))
          .where(eq(clinics.id, clinicId))
          .limit(1);
        if (names) {
          const cancellation = await notifications.enqueue(
            database,
            appointmentCancelledNotification({
              clinicId,
              patientEmail: result.patientEmail,
              appointmentId,
              clinicName: names.clinicName,
              branchName: names.branchName,
              startsAt: result.startsAt.toISOString(),
              dedupeKey: `appointment-cancelled:${appointmentId}`,
            }),
          );
          notifications.attemptDelivery(cancellation.id);
        }
      }
      return result.updated;
    },
    recentPatients: async (clinicId, dentistId, branchId) => {
      const rows = await database
        .select({
          patientId: patients.id,
          patientNumber: patients.patientNumber,
          firstName: patients.firstName,
          lastName: patients.lastName,
          serviceName: services.name,
          lastVisit: appointments.startsAt,
        })
        .from(appointments)
        .innerJoin(
          patients,
          and(
            eq(appointments.patientId, patients.id),
            eq(patients.clinicId, clinicId),
          ),
        )
        .leftJoin(
          services,
          and(
            eq(appointments.serviceId, services.id),
            eq(services.clinicId, clinicId),
          ),
        )
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            eq(appointments.dentistId, dentistId),
            branchId ? eq(appointments.branchId, branchId) : undefined,
            lt(appointments.startsAt, new Date()),
            isNull(patients.deletedAt),
          ),
        )
        .orderBy(desc(appointments.startsAt))
        .limit(30);
      const seen = new Set<string>();
      return rows
        .filter((row) => {
          if (seen.has(row.patientId)) return false;
          seen.add(row.patientId);
          return true;
        })
        .slice(0, 5);
    },
  };
}
