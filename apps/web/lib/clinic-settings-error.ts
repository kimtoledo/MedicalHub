export type ClinicSettingsErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "service";

export function classifyClinicSettingsError(status: number): ClinicSettingsErrorKind {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  return "service";
}
