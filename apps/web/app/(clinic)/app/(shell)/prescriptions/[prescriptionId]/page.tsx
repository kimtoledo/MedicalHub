import { redirect, notFound } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import PrescriptionDetailClient from "./PrescriptionDetailClient";

export type PrescriptionDetail = {
  id: string;
  encounterId: string | null;
  amendedFromId: string | null;
  branchId: string;
  prcLicenseNumber: string | null;
  clinicNameSnapshot: string | null;
  clinicAddressSnapshot: string | null;
  patientNameSnapshot: string | null;
  dentistNameSnapshot: string | null;
  notes: string | null;
  issuedAt: string | null;
  /** Template ID used when this Rx was issued. */
  templateId: string;
  /** Clinic logo URL snapshotted at issuance. */
  clinicLogoUrl: string | null;
  /** Dentist signature (base64 data-URL) snapshotted at issuance. */
  signatureUrl: string | null;
  patient: { id: string; firstName: string; lastName: string; patientNumber: string };
  dentist: { id: string; firstName: string; lastName: string; licenseNumber: string | null } | null;
  clinic: { name: string; address: string | null; city: string | null; phone: string | null; logoUrl: string | null };
  items: Array<{
    id: string;
    medicineName: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    specialInstructions: string | null;
    sortOrder: number;
  }>;
};

export default async function PrescriptionDetailPage({
  params,
}: {
  params: { prescriptionId: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const cookieHeader = cookies().toString();
  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/prescriptions/${params.prescriptionId}`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  if (res.status === 404) notFound();
  if (!res.ok) redirect("/app/prescriptions");

  const json = await res.json() as { success: boolean; data: PrescriptionDetail };
  if (!json.success) redirect("/app/prescriptions");

  return (
    <PrescriptionDetailClient
      prescription={json.data}
      clinicId={identity.clinicId}
    />
  );
}
