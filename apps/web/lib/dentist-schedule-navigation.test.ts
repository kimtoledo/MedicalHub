import { describe, expect, it } from "vitest";
import {
  appointmentDetailHref,
  canDentistManageAppointment,
  patientProfileHref,
} from "./dentist-schedule-navigation";

describe("dentist schedule patient navigation", () => {
  it("builds the dentist patient-profile path for a linked appointment", () => {
    expect(patientProfileHref("patient-1", true)).toBe(
      "/app/dentist/patients/patient-1",
    );
  });

  it("does not present an unlinked public booking as a patient link", () => {
    expect(patientProfileHref(null, true)).toBeNull();
  });

  it("allows appointment actions only for the assigned dentist", () => {
    expect(canDentistManageAppointment("dentist-1", "dentist-1")).toBe(true);
    expect(canDentistManageAppointment("dentist-2", "dentist-1")).toBe(false);
    expect(canDentistManageAppointment(null, "dentist-1")).toBe(false);
  });

  it("builds the appointment-detail path for both dentist and clinic views", () => {
    expect(appointmentDetailHref("appt-1", true)).toBe(
      "/app/dentist/schedule/appt-1",
    );
    expect(appointmentDetailHref("appt-1", false)).toBe(
      "/app/appointments/appt-1",
    );
  });
});
