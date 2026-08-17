import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { FeatureKey } from "@dentra/shared";
import { buildApp } from "../src/app.js";
import {
  ClinicDashboardError,
  type ClinicDashboardService,
} from "../src/clinic/dashboard-service.js";
import type { EntitlementService } from "../src/entitlements/service.js";
import type { AuthServices, AuthorizationContext } from "../src/auth/types.js";
import type { ApiConfig } from "../src/config.js";
const config: ApiConfig = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 3001,
  logLevel: "silent",
  corsOrigins: [],
  authSecret: "test-secret-that-is-at-least-32-characters",
  authBaseUrl: "http://localhost:3001",
};
const clinicId = "00000000-0000-0000-0000-000000000101",
  otherClinicId = "00000000-0000-0000-0000-000000000201",
  branchId = "00000000-0000-0000-0000-000000000111",
  dentistId = "00000000-0000-0000-0000-000000000401",
  appointmentId = "00000000-0000-0000-0000-000000000501";
const member: AuthorizationContext = {
  user: { id: "user", email: "staff@test", name: "Staff", platformRole: null },
  strategies: ["clinicMember"],
  clinicMemberships: [
    { clinicId, branchId, role: "clinic_admin", dentistId: null },
  ],
};
const dentist: AuthorizationContext = {
  ...member,
  clinicMemberships: [{ clinicId, branchId, role: "dentist", dentistId }],
};
const auth = (context: AuthorizationContext): AuthServices => ({
  handler: vi.fn(async () => new Response()),
  getSession: vi.fn(async () => ({
    session: { id: "s", userId: "user", expiresAt: new Date("2030-01-01") },
    user: context.user,
  })),
  resolveAuthorization: vi.fn(async () => context),
});
const entitlements: EntitlementService = {
  resolve: vi.fn(async (id) => ({
    clinic: { id, name: "Clinic", status: "active", maintenanceMode: false },
    subscription: null,
    entitlements: [
      FeatureKey.APPOINTMENTS_CALENDAR,
      FeatureKey.APPOINTMENTS_MANAGE,
      FeatureKey.PATIENTS_MANAGE,
      FeatureKey.TREATMENT_RECORDS,
    ].map((featureKey) => ({
      featureKey,
      isEnabled: true,
      source: "package" as const,
      expiresAt: null,
    })),
  })),
};
function service(): ClinicDashboardService {
  return {
    appointmentAvailability: vi.fn(async () => ({ durationMinutes: 30, slots: [], closedReason: null })),
    appointmentOptions: vi.fn(async () => ({ branches: [], dentists: [], services: [] })),
    createAppointment: vi.fn(async () => ({ id: appointmentId, status: "confirmed" as const, startsAt: new Date("2030-01-10T01:00:00.000Z"), endsAt: new Date("2030-01-10T01:30:00.000Z") })),
    completeQuickService: vi.fn(async () => ({ appointmentId, encounterId: "00000000-0000-0000-0000-000000000801", treatmentRecordId: "00000000-0000-0000-0000-000000000901" })),
    summary: vi.fn(async () => ({
      todayAppointmentCount: 1,
      checkedInCount: 0,
      upcomingCount: 1,
      activePatientCount: 20,
      appointments: [],
    })),
    appointments: vi.fn(async () => []),
    appointment: vi.fn(async () => null),
    updateStatus: vi.fn(async () => ({
      id: appointmentId,
      status: "checked_in",
    })),
    recentPatients: vi.fn(async () => []),
  };
}
let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});
async function setup(context: AuthorizationContext, s: ClinicDashboardService) {
  app = await buildApp({
    config,
    checkDatabase: async () => undefined,
    logger: false,
    auth: auth(context),
    entitlements,
    clinicDashboard: s,
  });
}
describe("clinic dashboard routes", () => {
  it("creates an internal appointment through the protected clinic workflow", async () => {
    const s = service();
    await setup(member, s);
    const response = await app!.inject({ method: "POST", url: `/v1/clinic/appointments?clinicId=${clinicId}`, payload: { branchId, patientId: "00000000-0000-0000-0000-000000000601", dentistId, serviceId: "00000000-0000-0000-0000-000000000701", startsAt: "2030-01-10T09:00:00+08:00" } });
    expect(response.statusCode).toBe(201);
    expect(s.createAppointment).toHaveBeenCalledWith(clinicId, expect.objectContaining({ branchId, dentistId }), expect.anything(), undefined);
  });
  it("returns clinic-scoped internal availability", async () => {
    const s = service();
    await setup(member, s);
    const response = await app!.inject({ method: "GET", url: `/v1/clinic/appointment-availability?clinicId=${clinicId}&branchId=${branchId}&dentistId=${dentistId}&serviceId=00000000-0000-0000-0000-000000000701&date=2030-01-10` });
    expect(response.statusCode).toBe(200);
    expect(s.appointmentAvailability).toHaveBeenCalledWith(clinicId, expect.objectContaining({ branchId, dentistId, date: "2030-01-10" }), undefined);
  });
  it("completes a quick service through the clinical entitlement", async () => {
    const s = service();
    await setup(member, s);
    const response = await app!.inject({ method: "POST", url: `/v1/clinic/appointments/${appointmentId}/quick-complete?clinicId=${clinicId}`, payload: { toothRef: "General" } });
    expect(response.statusCode).toBe(201);
    expect(s.completeQuickService).toHaveBeenCalledWith(clinicId, appointmentId, { toothRef: "General" }, expect.anything(), undefined);
  });
  it("scopes summary and appointments to the membership branch", async () => {
    const s = service();
    await setup(member, s);
    const summary = await app!.inject({
      method: "GET",
      url: `/v1/clinic/dashboard/summary?clinicId=${clinicId}&date=2030-01-10`,
    });
    const list = await app!.inject({
      method: "GET",
      url: `/v1/clinic/appointments?clinicId=${clinicId}&date=2030-01-10`,
    });
    expect(summary.statusCode).toBe(200);
    expect(list.statusCode).toBe(200);
    expect(s.summary).toHaveBeenCalledWith(clinicId, branchId, "2030-01-10");
  });
  it("writes appointment status through the protected workflow", async () => {
    const s = service();
    await setup(member, s);
    const response = await app!.inject({
      method: "PATCH",
      url: `/v1/clinic/appointments/${appointmentId}/status?clinicId=${clinicId}`,
      payload: { status: "checked_in" },
    });
    expect(response.statusCode).toBe(200);
    expect(s.updateStatus).toHaveBeenCalledWith(
      clinicId,
      appointmentId,
      "checked_in",
      expect.anything(),
      undefined,
    );
  });
  it("restricts dentist schedule and status changes to the linked dentist", async () => {
    const s = service();
    await setup(dentist, s);
    await app!.inject({
      method: "GET",
      url: `/v1/clinic/dentist/schedule?clinicId=${clinicId}&date=2030-01-10`,
    });
    await app!.inject({
      method: "PATCH",
      url: `/v1/clinic/appointments/${appointmentId}/status?clinicId=${clinicId}`,
      payload: { status: "in_progress" },
    });
    expect(s.appointments).toHaveBeenCalledWith(
      clinicId,
      branchId,
      "2030-01-10",
      undefined,
      dentistId,
      undefined,
      undefined,
      undefined,
    );
    expect(s.updateStatus).toHaveBeenCalledWith(
      clinicId,
      appointmentId,
      "in_progress",
      expect.anything(),
      dentistId,
    );
  });
  it("denies cross-tenant dashboard reads before querying", async () => {
    const s = service();
    await setup(member, s);
    const response = await app!.inject({
      method: "GET",
      url: `/v1/clinic/dashboard/summary?clinicId=${otherClinicId}&date=2030-01-10`,
    });
    expect(response.statusCode).toBe(403);
    expect(s.summary).not.toHaveBeenCalled();
  });
  it("returns transition conflicts from the service", async () => {
    const s = service();
    s.updateStatus = vi.fn(async () => {
      throw new ClinicDashboardError(
        "INVALID_STATUS_TRANSITION",
        "Invalid",
        409,
      );
    });
    await setup(member, s);
    const response = await app!.inject({
      method: "PATCH",
      url: `/v1/clinic/appointments/${appointmentId}/status?clinicId=${clinicId}`,
      payload: { status: "completed" },
    });
    expect(response.statusCode).toBe(409);
  });
});
