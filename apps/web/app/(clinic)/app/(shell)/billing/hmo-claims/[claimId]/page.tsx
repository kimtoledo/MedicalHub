import { redirect, notFound } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import ClaimDetailClient from "./ClaimDetailClient";

export type ClaimDetail = {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  payerNameSnapshot: string;
  hmoPayer: string | null;
  membershipId: string | null;
  invoiceId: string | null;
  encounterId: string | null;
  claimAmountPhp: string;
  approvedAmountPhp: string | null;
  loaCode: string | null;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  paidAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  preparedBy: string | null;
  createdAt: string;
};

export type ClaimPdfData = {
  claim: ClaimDetail;
  encounter: {
    date: string;
    chiefComplaint: string | null;
    procedures: string | null;
  } | null;
  invoice: {
    invoiceNumber: string;
    totalAmountPhp: string;
  } | null;
  membership: {
    cardNumber: string;
    memberName: string | null;
    coverageType: string;
    effectiveDate: string | null;
    expiryDate: string | null;
  } | null;
};

export default async function ClaimDetailPage({
  params,
}: {
  params: { claimId: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const cookieHeader = cookies().toString();
  const [claimRes, pdfRes] = await Promise.all([
    fetch(getBackendUrl(`/v1/clinic/${identity.clinicId}/hmo/claims/${params.claimId}`), {
      headers: { cookie: cookieHeader }, cache: "no-store",
    }),
    fetch(getBackendUrl(`/v1/clinic/${identity.clinicId}/hmo/claims/${params.claimId}/pdf-data`), {
      headers: { cookie: cookieHeader }, cache: "no-store",
    }),
  ]);

  if (claimRes.status === 404) notFound();
  if (!claimRes.ok) redirect("/app/billing/hmo-claims");

  const [claimJson, pdfJson] = await Promise.all([
    claimRes.json() as Promise<{ success: boolean; data: ClaimDetail }>,
    pdfRes.ok ? pdfRes.json() as Promise<{ success: boolean; data: ClaimPdfData }> : Promise.resolve({ success: false, data: null }),
  ]);

  return (
    <ClaimDetailClient
      claim={claimJson.data}
      pdfData={pdfJson.success ? (pdfJson as { success: boolean; data: ClaimPdfData }).data : null}
      clinicId={identity.clinicId}
      isAdmin={identity.isAdmin}
    />
  );
}
