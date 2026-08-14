import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import DomainsClient from "./DomainsClient";

export type CustomDomain = {
  id: string;
  hostname: string;
  status: "pending_verification" | "verified" | "active" | "failed" | "disabled";
  verifiedAt: string | null;
  activatedAt: string | null;
  lastCheckedAt: string | null;
  failureReason: string | null;
  verificationToken: string;
};

export default async function CustomDomainsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  if (!identity.isAdmin) redirect("/app/settings");
  const context = await getClinicShellContext(identity).catch(() => null);
  if (!context?.entitlements["custom_domain.manage"]) notFound();

  const cookieHeader = cookies().toString();
  const res = await fetch(
    getBackendUrl(`/v1/clinic/${identity.clinicId}/custom-domains`),
    { headers: { cookie: cookieHeader }, cache: "no-store" }
  );

  const json = res.ok
    ? (await res.json() as { success: boolean; data: CustomDomain[] })
    : { success: false, data: [] };

  return (
    <DomainsClient
      domains={json.success ? json.data : []}
      clinicId={identity.clinicId}
    />
  );
}
