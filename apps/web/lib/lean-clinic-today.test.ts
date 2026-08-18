import { describe, expect, it } from "vitest";
import {
  groupTodayAppointments,
  todayAppointmentLinkLabel,
  todayQueueForStatus,
} from "./lean-clinic-today";
import type { DashboardAppointment } from "@/components/app/dashboard/types";

const appointment = (id: string, status: string): DashboardAppointment => ({
  id,
  status,
  branchId: "branch-1",
  branchName: "Main",
  patientId: "patient-1",
  patientFirstName: "Ana",
  patientLastName: "Santos",
  patientNumber: "PAT-001",
  dentistId: "dentist-1",
  dentistFirstName: "Maria",
  dentistLastName: "Reyes",
  serviceId: "service-1",
  serviceName: "Cleaning",
  serviceWorkflowMode: "quick",
  startsAt: "2026-08-18T01:00:00.000Z",
  endsAt: "2026-08-18T01:30:00.000Z",
  chiefComplaint: null,
});

describe("lean clinic Today queues", () => {
  it.each([
    ["checked_in", "waiting"],
    ["in_progress", "inTreatment"],
    ["pending", "upcoming"],
    ["confirmed", "upcoming"],
    ["completed", "completed"],
    ["cancelled", "closed"],
    ["no_show", "closed"],
  ] as const)("maps %s to %s", (status, queue) => {
    expect(todayQueueForStatus(status)).toBe(queue);
  });

  it("groups every appointment into one operational queue", () => {
    const rows = [
      appointment("waiting", "checked_in"),
      appointment("treating", "in_progress"),
      appointment("upcoming", "confirmed"),
      appointment("done", "completed"),
      appointment("closed", "cancelled"),
    ];

    const grouped = groupTodayAppointments(rows);
    expect(Object.values(grouped).flat().map((item) => item.id)).toEqual([
      "waiting",
      "treating",
      "upcoming",
      "done",
      "closed",
    ]);
  });

  it("uses a billing-oriented next label only after completion", () => {
    expect(todayAppointmentLinkLabel("in_progress")).toBe("Continue visit");
    expect(todayAppointmentLinkLabel("completed")).toBe("Review & bill");
  });
});
