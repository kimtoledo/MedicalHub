import { redirect, notFound } from "next/navigation";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import EncounterDetailClient from "./EncounterDetailClient";

export type EncounterDetail = {
  id: string;
  date: string;
  status: string;
  chiefComplaint: string | null;
  examination: string | null;
  assessment: string | null;
  procedures: string | null;
  recommendations: string | null;
  notes: string | null;
  branchId: string;
  branchName: string | null;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientNumber: string;
  dentistId: string | null;
  dentistFirstName: string | null;
  dentistLastName: string | null;
};

export default async function EncounterDetailPage({
  params,
}: {
  params: { encounterId: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const context = await getClinicShellContext(identity).catch(() => null);
  const hasClinicalRole = ["clinic_owner", "clinic_admin", "dentist", "dental_assistant"].includes(identity.membershipRole);
  const cookieHeader = cookies().toString();
  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/encounters/${params.encounterId}`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  if (res.status === 404) notFound();
  if (!res.ok) redirect("/app/encounters");

  const json = await res.json() as { success: boolean; data: EncounterDetail };
  if (!json.success) redirect("/app/encounters");

  return (
    <EncounterDetailClient
      encounter={json.data}
      clinicId={identity.clinicId}
      isDentist={identity.role === "dentist" || identity.isAdmin}
      canPrescribe={identity.membershipRole === "dentist" && Boolean(context?.entitlements["clinical.prescriptions"])}
      canUseFiles={hasClinicalRole && Boolean(context?.entitlements["clinical.radiographs"])}
      canBill={identity.role !== "dentist" && Boolean(context?.entitlements["billing.invoices"])}
    />
  );
}
