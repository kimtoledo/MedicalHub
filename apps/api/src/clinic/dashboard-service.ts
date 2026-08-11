import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
} from "drizzle-orm";
import type { DB } from "@dentra/db";
import { writeAudit } from "@dentra/db/audit";
import {
  appointments,
  appointmentStatusHistory,
  branches,
  dentists,
  patients,
  services,
} from "@dentra/db/schema";
import { AuditAction, type AppointmentStatus } from "@dentra/shared";
import type { PatientActor } from "./patients-service.js";

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
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  chiefComplaint: string | null;
};
export type ClinicDashboardService = {
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
  ) => Promise<AppointmentView[]>;
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
function range(date: string) {
  const start = new Date(`${date}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
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
    status: value.status,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    chiefComplaint: value.chiefComplaint,
  };
}
export function createClinicDashboardService(
  database: DB,
): ClinicDashboardService {
  const list = async (
    clinicId: string,
    branchId: string | undefined,
    date: string,
    status?: string,
    dentistId?: string,
  ) => {
    const { start, end } = range(date);
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
    appointments: list,
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
    ) =>
      database.transaction(async (transaction) => {
        const [current] = await transaction
          .select({
            id: appointments.id,
            status: appointments.status,
            dentistId: appointments.dentistId,
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
        return updated;
      }),
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
