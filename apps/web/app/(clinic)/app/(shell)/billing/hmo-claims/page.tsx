import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import HmoClaimsClient from "./HmoClaimsClient";

export type ClaimListItem = {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  payerNameSnapshot: string;
  invoiceId: string | null;
  encounterId: string | null;
  claimAmountPhp: string;
  approvedAmountPhp: string | null;
  loaCode: string | null;
  status: string;
  paidAt: string | null;
  submittedAt: string | null;
  createdAt: string;
};

export default async function HmoClaimsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const status = searchParams.status ?? "";
  const page = parseInt(searchParams.page ?? "1", 10);
  const cookieHeader = cookies().toString();

  const qs = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (status) qs.set("status", status);

  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/hmo/claims?${qs}`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  const json = res.ok
    ? await res.json() as { success: boolean; data: ClaimListItem[]; total: number; page: number }
    : { success: false, data: [], total: 0, page: 1 };

  return (
    <HmoClaimsClient
      claims={json.success ? json.data : []}
      total={json.success ? json.total : 0}
      currentPage={json.success ? json.page : 1}
      currentStatus={status}
      clinicId={identity.clinicId}
    />
  );
}
