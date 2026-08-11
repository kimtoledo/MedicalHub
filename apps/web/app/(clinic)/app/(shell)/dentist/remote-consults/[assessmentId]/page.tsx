import { redirect, notFound } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import RemoteConsultDetailClient from "./RemoteConsultDetailClient";

export type AssessmentDetail = {
  id: string;
  clinicId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string | null;
  complaint: string;
  photoCount: number;
  photos: Array<{
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    sortOrder: number;
  }>;
  status: string;
  nextStep: string | null;
  dentistNotes: string | null;
  reviewedAt: string | null;
  emailSent: string;
  patientId: string | null;
  reviewedBy: string | null;
  createdAt: string;
};

export default async function RemoteConsultDetailPage({
  params,
}: {
  params: { assessmentId: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const cookieHeader = cookies().toString();
  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/remote-consults/${params.assessmentId}`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  if (res.status === 404) notFound();
  if (!res.ok) redirect("/app/dentist/remote-consults");

  const json = await res.json() as { success: boolean; data: AssessmentDetail };
  if (!json.success) redirect("/app/dentist/remote-consults");

  return (
    <RemoteConsultDetailClient
      assessment={json.data}
      clinicId={identity.clinicId}
      isDentist={identity.role === "dentist" || identity.isAdmin}
    />
  );
}
