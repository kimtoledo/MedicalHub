import { describe, expect, it } from "vitest";
import { classifyClinicSettingsError } from "./clinic-settings-error";

describe("classifyClinicSettingsError", () => {
  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not-found"],
    [500, "service"],
    [503, "service"],
  ] as const)("maps HTTP %s to %s", (status, expected) => {
    expect(classifyClinicSettingsError(status)).toBe(expected);
  });
});
