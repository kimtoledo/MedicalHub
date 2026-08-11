import { redirect } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import RemoteConsultsClient from "./RemoteConsultsClient";

export type ConsultListItem = {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string | null;
  complaint: string;
  photoCount: number;
  status: string;
  nextStep: string | null;
  dentistNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export default async function RemoteConsultsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const status = searchParams.status ?? "pending";
  const page = parseInt(searchParams.page ?? "1", 10);
  const cookieHeader = cookies().toString();

  const url = getBackendUrl(
    `/v1/clinic/${identity.clinicId}/remote-consults?status=${status}&page=${page}&pageSize=20`
  );
  const res = await fetch(url, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  const json = res.ok
    ? await res.json() as { success: boolean; data: ConsultListItem[]; total: number; page: number }
    : { success: false, data: [], total: 0, page: 1 };

  // Build the public consult submission URL for sharing
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const shareUrl = `${baseUrl}/consult/${identity.clinicId}`;

  return (
    <RemoteConsultsClient
      consults={json.success ? json.data : []}
      total={json.success ? json.total : 0}
      currentPage={json.success ? json.page : 1}
      currentStatus={status}
      clinicId={identity.clinicId}
      shareUrl={shareUrl}
      isDentist={identity.role === "dentist" || identity.isAdmin}
    />
  );
}
