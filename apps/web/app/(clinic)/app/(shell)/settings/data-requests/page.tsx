import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import DataRequestsClient from "./DataRequestsClient";

export type SupportAccessRequest = {
  id: string;
  status: "pending" | "approved" | "denied" | "expired" | "used";
  reason: string;
  expiresAt: string | null;
  createdAt: string;
};

export type TenantExportRequest = {
  id: string;
  status: "requested" | "processing" | "ready" | "failed" | "cancelled";
  requestedAt: string;
  completedAt: string | null;
  retentionUntil: string | null;
  failureReason: string | null;
  artifactReference: string | null;
  createdAt: string;
};

async function fetchJson<T>(url: URL, cookieHeader: string, fallback: T): Promise<T> {
  const res = await fetch(url, { headers: { cookie: cookieHeader }, cache: "no-store" });
  if (!res.ok) return fallback;
  const json = await res.json() as { success: boolean; data: T };
  return json.success ? json.data : fallback;
}

export default async function DataRequestsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  if (!identity.isAdmin) redirect("/app/settings");

  const cookieHeader = cookies().toString();
  const [supportAccess, exports] = await Promise.all([
    fetchJson<SupportAccessRequest[]>(getBackendUrl(`/v1/clinic/${identity.clinicId}/operations/support-access`), cookieHeader, []),
    fetchJson<TenantExportRequest[]>(getBackendUrl(`/v1/clinic/${identity.clinicId}/operations/exports`), cookieHeader, []),
  ]);

  return <DataRequestsClient supportAccess={supportAccess} exports={exports} clinicId={identity.clinicId} />;
}
