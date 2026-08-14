import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import AppPageError from "@/components/app/AppPageError";
import { ClinicSettingsLoadError, getClinicClosures, getClinicSettings } from "@/lib/clinic-settings";
import { classifyClinicSettingsError } from "@/lib/clinic-settings-error";
import ClinicHolidaysClient from "./ClinicHolidaysClient";

export default async function ClinicHolidaysPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  if (!identity.isAdmin) redirect("/app/settings");

  try {
    const [settings, closures] = await Promise.all([
      getClinicSettings(identity.clinicId),
      getClinicClosures(identity.clinicId),
    ]);
    return <ClinicHolidaysClient clinicId={identity.clinicId} branches={settings.branches} closures={closures} />;
  } catch (caught) {
    const kind = caught instanceof ClinicSettingsLoadError ? classifyClinicSettingsError(caught.status) : "service";
    if (kind === "unauthenticated") redirect("/cl-login");
    if (kind === "forbidden") {
      return <AppPageError title="Holidays & closures restricted" message="Your current clinic role does not allow settings access." kind="forbidden" />;
    }
    if (kind === "not-found") {
      return <AppPageError title="Clinic not found" message="This clinic is unavailable or no longer active." kind="not-found" />;
    }
    return (
      <AppPageError
        title="Holidays & closures temporarily unavailable"
        message="The server could not load closures. Ask an administrator to confirm database migrations are current, then retry."
      />
    );
  }
}
