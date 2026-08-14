import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import AppPageError from "@/components/app/AppPageError";
import PrescriptionTemplateClient from "./PrescriptionTemplateClient";

export type DentistDefaults = {
  prcLicenseNumber: string | null;
  signatureUrl: string | null;
  templateId: string;
};

export default async function PrescriptionTemplatePage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  // This page is for dentists only — they must have a dentist session role
  // The /encounters endpoint returns prescriber defaults and also validates dentist access
  const cookieHeader = cookies().toString();
  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/prescriptions/encounters`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  if (res.status === 403) {
    return (
      <AppPageError
        title="Dentist access required"
        message="Only dentists can manage prescription templates and signatures."
        kind="forbidden"
      />
    );
  }

  if (!res.ok) redirect("/app/prescriptions");

  const json = await res.json() as { success: boolean; data: { prcLicenseNumber: string | null; signatureUrl: string | null; templateId: string } };
  if (!json.success) redirect("/app/prescriptions");

  const defaults: DentistDefaults = {
    prcLicenseNumber: json.data.prcLicenseNumber,
    signatureUrl: json.data.signatureUrl,
    templateId: json.data.templateId ?? "classic",
  };

  return (
    <PrescriptionTemplateClient
      clinicId={identity.clinicId}
      defaults={defaults}
    />
  );
}
