import { describe, expect, it } from "vitest";
import {
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
});
