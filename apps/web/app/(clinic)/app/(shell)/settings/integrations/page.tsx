import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import IntegrationsClient from "./IntegrationsClient";

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: "active" | "revoked";
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export type Webhook = {
  id: string;
  name: string;
  endpointUrl: string;
  eventTypes: string[];
  status: "active" | "disabled";
  lastDeliveryAt: string | null;
  failureReason: string | null;
  createdAt: string;
};

export type NotificationProviderStatus = {
  id: string;
  channel: "email" | "sms";
  providerName: "sendgrid" | "twilio";
  fromAddress: string;
  status: "active" | "disabled";
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
};

async function fetchJson<T>(url: URL, cookieHeader: string, fallback: T): Promise<T> {
  const res = await fetch(url, { headers: { cookie: cookieHeader }, cache: "no-store" });
  if (!res.ok) return fallback;
  const json = await res.json() as { success: boolean; data: T };
  return json.success ? json.data : fallback;
}

export default async function IntegrationsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");
  if (!identity.isAdmin) redirect("/app/settings");
  const context = await getClinicShellContext(identity).catch(() => null);
  if (!context?.entitlements["integrations.api"]) notFound();

  const cookieHeader = cookies().toString();
  const [apiKeys, webhooks, notificationProviders] = await Promise.all([
    fetchJson<ApiKey[]>(getBackendUrl(`/v1/clinic/${identity.clinicId}/integrations/api-keys`), cookieHeader, []),
    fetchJson<Webhook[]>(getBackendUrl(`/v1/clinic/${identity.clinicId}/integrations/webhooks`), cookieHeader, []),
    fetchJson<NotificationProviderStatus[]>(getBackendUrl(`/v1/clinic/${identity.clinicId}/notification-providers`), cookieHeader, []),
  ]);

  return <IntegrationsClient apiKeys={apiKeys} webhooks={webhooks} notificationProviders={notificationProviders} clinicId={identity.clinicId} />;
}
