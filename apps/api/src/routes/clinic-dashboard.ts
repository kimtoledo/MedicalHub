import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppointmentStatus, FeatureKey } from "@dentra/shared";
import type { AuthServices, AuthorizationContext } from "../auth/types.js";
import { getClinicAccess } from "../auth/authorization.js";
import type { EntitlementService } from "../entitlements/service.js";
import { requireClinicFeature } from "../clinic/access.js";
import {
  ClinicDashboardError,
  type ClinicDashboardService,
} from "../clinic/dashboard-service.js";
import { postgresUuidSchema } from "../validation.js";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const date = z.union([z.literal("today").transform(() => today()), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).default(today());
const clinicQuery = z.object({
  clinicId: postgresUuidSchema,
  branchId: postgresUuidSchema.optional(),
  date,
  status: z
    .enum(Object.values(AppointmentStatus) as [string, ...string[]])
    .optional(),
});
const params = z.object({ appointmentId: postgresUuidSchema });
const statusBody = z
  .object({
    status: z.enum([
      "confirmed",
      "checked_in",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ]),
  })
  .strict();
const clinicReadRoles = [
  "clinic_owner",
  "clinic_admin",
  "receptionist",
  "dental_assistant",
] as const;
const readRoles = [...clinicReadRoles, "dentist"] as const;
const manageRoles = [
  "clinic_owner",
  "clinic_admin",
  "dentist",
  "receptionist",
  "dental_assistant",
] as const;
function dentistId(auth: AuthorizationContext, clinicId: string) {
  return (
    getClinicAccess(auth, clinicId).find(
      (item) => item.role === "dentist" && item.dentistId,
    )?.dentistId ?? null
  );
}
function scopedBranch(
  auth: AuthorizationContext,
  clinicId: string,
  requested?: string,
): string | undefined {
  const memberships = getClinicAccess(auth, clinicId);
  if (memberships.some((item) => item.branchId === null)) return requested;
  const allowed = Array.from(
    new Set(
      memberships.flatMap((item) => (item.branchId ? [item.branchId] : [])),
    ),
  );
  if (requested) {
    if (!allowed.includes(requested))
      throw new ClinicDashboardError(
        "BRANCH_FORBIDDEN",
        "Branch access is required",
        403,
      );
    return requested;
  }
  if (allowed.length === 1) return allowed[0];
  throw new ClinicDashboardError(
    "BRANCH_REQUIRED",
    "Select an authorized branch",
    400,
  );
}
function actor(request: FastifyRequest, auth: AuthorizationContext) {
  return {
    id: auth.user.id,
    email: auth.user.email,
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  };
}
function error(reply: FastifyReply, caught: unknown) {
  if (caught instanceof ClinicDashboardError)
    return reply
      .status(caught.statusCode)
      .send({
        success: false,
        error: { code: caught.code, message: caught.message },
      });
  throw caught;
}
export async function registerClinicDashboardRoutes(
  app: FastifyInstance,
  options: {
    auth: AuthServices;
    entitlements: EntitlementService;
    db?: import('@dentra/db').DB;
    dashboard: ClinicDashboardService;
  },
) {
  app.get("/v1/clinic/dashboard/summary", async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    if (!query.success)
      return reply
        .status(400)
        .send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid dashboard filters",
          },
        });
    const auth = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.APPOINTMENTS_CALENDAR,
      [...clinicReadRoles],
    );
    if (!auth) return;
    try {
      return reply.send({
        success: true,
        data: await options.dashboard.summary(
          query.data.clinicId,
          scopedBranch(auth, query.data.clinicId, query.data.branchId),
          query.data.date,
        ),
      });
    } catch (caught) {
      return error(reply, caught);
    }
  });
  app.get("/v1/clinic/appointments", async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    if (!query.success)
      return reply
        .status(400)
        .send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid appointment filters",
          },
        });
    const auth = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.APPOINTMENTS_CALENDAR,
      [...readRoles],
    );
    if (!auth) return;
    const restriction = getClinicAccess(auth, query.data.clinicId).some(
      (item) => item.role !== "dentist",
    )
      ? undefined
      : (dentistId(auth, query.data.clinicId) ?? undefined);
    try {
      return reply.send({
        success: true,
        data: await options.dashboard.appointments(
          query.data.clinicId,
          scopedBranch(auth, query.data.clinicId, query.data.branchId),
          query.data.date,
          query.data.status,
          restriction,
        ),
      });
    } catch (caught) {
      return error(reply, caught);
    }
  });
  app.patch(
    "/v1/clinic/appointments/:appointmentId/status",
    async (request, reply) => {
      const query = clinicQuery
        .pick({ clinicId: true })
        .safeParse(request.query);
      const parsedParams = params.safeParse(request.params);
      const body = statusBody.safeParse(request.body);
      if (!query.success || !parsedParams.success || !body.success)
        return reply
          .status(400)
          .send({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid appointment status update",
            },
          });
      const auth = await requireClinicFeature(
        request,
        reply,
        options,
        query.data.clinicId,
        FeatureKey.APPOINTMENTS_MANAGE,
        [...manageRoles],
      );
      if (!auth) return;
      const dentist = getClinicAccess(auth, query.data.clinicId).some(
        (item) => item.role !== "dentist",
      )
        ? undefined
        : (dentistId(auth, query.data.clinicId) ?? undefined);
      try {
        return reply.send({
          success: true,
          data: await options.dashboard.updateStatus(
            query.data.clinicId,
            parsedParams.data.appointmentId,
            body.data.status,
            actor(request, auth),
            dentist,
          ),
        });
      } catch (caught) {
        return error(reply, caught);
      }
    },
  );
  app.get("/v1/clinic/dentist/schedule", async (request, reply) => {
    const query = clinicQuery.safeParse(request.query);
    if (!query.success)
      return reply
        .status(400)
        .send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid schedule filters",
          },
        });
    const auth = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.APPOINTMENTS_CALENDAR,
      ["dentist"],
    );
    if (!auth) return;
    const dentist = dentistId(auth, query.data.clinicId);
    if (!dentist)
      return reply
        .status(403)
        .send({
          success: false,
          error: {
            code: "DENTIST_PROFILE_REQUIRED",
            message: "A linked dentist profile is required",
          },
        });
    try {
      return reply.send({
        success: true,
        data: await options.dashboard.appointments(
          query.data.clinicId,
          scopedBranch(auth, query.data.clinicId, query.data.branchId),
          query.data.date,
          query.data.status,
          dentist,
        ),
      });
    } catch (caught) {
      return error(reply, caught);
    }
  });
  app.get("/v1/clinic/dentist/recent-patients", async (request, reply) => {
    const query = clinicQuery
      .pick({ clinicId: true, branchId: true })
      .safeParse(request.query);
    if (!query.success)
      return reply
        .status(400)
        .send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid recent-patient filters",
          },
        });
    const auth = await requireClinicFeature(
      request,
      reply,
      options,
      query.data.clinicId,
      FeatureKey.PATIENTS_MANAGE,
      ["dentist"],
    );
    if (!auth) return;
    const dentist = dentistId(auth, query.data.clinicId);
    if (!dentist)
      return reply
        .status(403)
        .send({
          success: false,
          error: {
            code: "DENTIST_PROFILE_REQUIRED",
            message: "A linked dentist profile is required",
          },
        });
    try {
      return reply.send({
        success: true,
        data: await options.dashboard.recentPatients(
          query.data.clinicId,
          dentist,
          scopedBranch(auth, query.data.clinicId, query.data.branchId),
        ),
      });
    } catch (caught) {
      return error(reply, caught);
    }
  });
}
