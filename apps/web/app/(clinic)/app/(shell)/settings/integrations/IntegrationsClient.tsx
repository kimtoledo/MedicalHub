"use client";

import { useState } from "react";
import {
  KeyRound, Webhook as WebhookIcon, Plus, Copy, Check, Ban,
  AlertCircle, ChevronLeft, Loader2, CalendarClock, FileSpreadsheet, History,
  Mail, MessageSquare,
} from "lucide-react";
import Link from "next/link";
import type { ApiKey, Webhook, NotificationProviderStatus } from "./page";

const SCOPES: { value: string; label: string }[] = [
  { value: "appointments.read", label: "Appointments — read" },
  { value: "appointments.write", label: "Appointments — write" },
  { value: "invoices.read", label: "Invoices — read" },
  { value: "webhooks.manage", label: "Webhooks — manage" },
];

const EVENT_TYPES: { value: string; label: string }[] = [
  { value: "appointment.created", label: "Appointment created" },
  { value: "appointment.updated", label: "Appointment updated" },
  { value: "invoice.paid", label: "Invoice paid" },
  { value: "invoice.refunded", label: "Invoice refunded" },
];

type Delivery = {
  id: string;
  eventType: string;
  status: "queued" | "delivered" | "failed";
  attempts: number;
  responseStatus: number | null;
  lastError: string | null;
  deliveredAt: string | null;
  createdAt: string;
};

const DELIVERY_STATUS_STYLES: Record<Delivery["status"], string> = {
  queued: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

function formatManila(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

function SecretReveal({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
      <p className="mb-1.5 text-xs font-semibold text-amber-800">{label} — copy it now, it won&apos;t be shown again</p>
      <div className="flex items-center gap-2">
        <input readOnly value={value} className="flex-1 truncate rounded-lg bg-white px-2.5 py-2 font-mono text-xs text-amber-900" />
        <button onClick={() => void copy()} className="flex items-center gap-1 rounded-lg border border-amber-300 px-2 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function ApiKeysSection({ apiKeys: initial, clinicId }: { apiKeys: ApiKey[]; clinicId: string }) {
  const [keys, setKeys] = useState(initial);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  async function reload() {
    const response = await fetch(`/api/clinic/${clinicId}/integrations/api-keys`, { credentials: "include" });
    const payload = await response.json();
    if (response.ok) setKeys(payload.data);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || scopes.length === 0) { setError("Name and at least one scope are required."); return; }
    setCreating(true); setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/integrations/api-keys`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), scopes }),
    });
    const payload = await response.json();
    setCreating(false);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to create this API key."); return; }
    setNewSecret(payload.data.secret);
    setName(""); setScopes([]);
    await reload();
  }

  async function revoke(keyId: string) {
    setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/integrations/api-keys/${keyId}/revoke`, { method: "POST", credentials: "include" });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? "Unable to revoke this key."); return; }
    await reload();
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-900"><KeyRound size={15} /> API keys</h2>

      <form onSubmit={(event) => { void create(event); }} className="mb-4 space-y-3 rounded-xl bg-violet-50 p-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Key name, e.g. Accounting sync"
          className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <div className="flex flex-wrap gap-3">
          {SCOPES.map((scope) => (
            <label key={scope.value} className="flex items-center gap-2 text-xs text-violet-700">
              <input
                type="checkbox"
                checked={scopes.includes(scope.value)}
                onChange={(event) => setScopes((prev) => event.target.checked ? [...prev, scope.value] : prev.filter((v) => v !== scope.value))}
              />
              {scope.label}
            </label>
          ))}
        </div>
        <button disabled={creating} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
          {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} {creating ? "Creating…" : "Create key"}
        </button>
      </form>

      {error && <p role="alert" className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}
      {newSecret && <SecretReveal label="API key secret" value={newSecret} />}

      {keys.length === 0 ? (
        <p className="text-xs text-violet-400">No API keys yet.</p>
      ) : (
        <ul className="space-y-2">
          {keys.map((key) => (
            <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-50 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-violet-900">{key.name} <span className="font-mono text-xs text-violet-400">{key.keyPrefix}…</span></p>
                <p className="text-xs text-violet-400">{key.scopes.join(", ")} · Last used {formatManila(key.lastUsedAt)}</p>
              </div>
              {key.status === "active" ? (
                <button onClick={() => void revoke(key.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                  <Ban size={12} /> Revoke
                </button>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Revoked</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WebhooksSection({ webhooks: initial, clinicId }: { webhooks: Webhook[]; clinicId: string }) {
  const [webhooks, setWebhooks] = useState(initial);
  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  async function reload() {
    const response = await fetch(`/api/clinic/${clinicId}/integrations/webhooks`, { credentials: "include" });
    const payload = await response.json();
    if (response.ok) setWebhooks(payload.data);
  }

  async function toggleDeliveries(webhookId: string) {
    if (expandedId === webhookId) { setExpandedId(null); return; }
    setExpandedId(webhookId);
    setLoadingDeliveries(true);
    const response = await fetch(`/api/clinic/${clinicId}/integrations/webhooks/${webhookId}/deliveries`, { credentials: "include" });
    const payload = await response.json();
    setLoadingDeliveries(false);
    if (response.ok) setDeliveries(payload.data);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !endpointUrl.trim() || eventTypes.length === 0) { setError("Name, endpoint URL, and at least one event type are required."); return; }
    setCreating(true); setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/integrations/webhooks`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), endpointUrl: endpointUrl.trim(), eventTypes }),
    });
    const payload = await response.json();
    setCreating(false);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to create this webhook."); return; }
    setNewSecret(payload.data.secret);
    setName(""); setEndpointUrl(""); setEventTypes([]);
    await reload();
  }

  async function disable(webhookId: string) {
    setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/integrations/webhooks/${webhookId}/disable`, { method: "POST", credentials: "include" });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? "Unable to disable this webhook."); return; }
    await reload();
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><WebhookIcon size={15} /> Webhooks</h2>
      <p className="mb-3 text-xs text-slate-500">Deliveries are signed (<code className="font-mono">x-dentra-webhook-signature</code>), retried with backoff for up to 5 attempts, and their history is visible below each webhook.</p>

      <form onSubmit={(event) => { void create(event); }} className="mb-4 space-y-3 rounded-xl bg-violet-50 p-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Webhook name, e.g. Billing sync"
          className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <input
          value={endpointUrl}
          onChange={(event) => setEndpointUrl(event.target.value)}
          placeholder="https://your-app.example.com/webhooks/dentra"
          className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <div className="flex flex-wrap gap-3">
          {EVENT_TYPES.map((eventType) => (
            <label key={eventType.value} className="flex items-center gap-2 text-xs text-violet-700">
              <input
                type="checkbox"
                checked={eventTypes.includes(eventType.value)}
                onChange={(event) => setEventTypes((prev) => event.target.checked ? [...prev, eventType.value] : prev.filter((v) => v !== eventType.value))}
              />
              {eventType.label}
            </label>
          ))}
        </div>
        <button disabled={creating} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
          {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} {creating ? "Creating…" : "Create webhook"}
        </button>
      </form>

      {error && <p role="alert" className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}
      {newSecret && <SecretReveal label="Webhook signing secret" value={newSecret} />}

      {webhooks.length === 0 ? (
        <p className="text-xs text-violet-400">No webhooks yet.</p>
      ) : (
        <ul className="space-y-2">
          {webhooks.map((webhook) => (
            <li key={webhook.id} className="rounded-xl border border-violet-50 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-violet-900">{webhook.name}</p>
                  <p className="truncate text-xs text-violet-400">{webhook.endpointUrl}</p>
                  <p className="text-xs text-violet-400">{webhook.eventTypes.join(", ")} · Last delivery {formatManila(webhook.lastDeliveryAt)}</p>
                  {webhook.failureReason && <p className="text-xs text-red-600">{webhook.failureReason}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button onClick={() => void toggleDeliveries(webhook.id)} className="flex items-center gap-1 rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50">
                    <History size={12} /> Deliveries
                  </button>
                  {webhook.status === "active" ? (
                    <button onClick={() => void disable(webhook.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                      <Ban size={12} /> Disable
                    </button>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Disabled</span>
                  )}
                </div>
              </div>
              {expandedId === webhook.id && (
                <div className="mt-2 rounded-lg bg-violet-50 p-2">
                  {loadingDeliveries ? (
                    <p className="text-xs text-violet-400">Loading…</p>
                  ) : deliveries.length === 0 ? (
                    <p className="text-xs text-violet-400">No deliveries yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {deliveries.map((delivery) => (
                        <li key={delivery.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-violet-700">{delivery.eventType} · {formatManila(delivery.createdAt)} · {delivery.attempts} attempt{delivery.attempts === 1 ? "" : "s"}</span>
                          <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${DELIVERY_STATUS_STYLES[delivery.status]}`}>{delivery.status}{delivery.responseStatus ? ` (${delivery.responseStatus})` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CalendarFeedSection({ apiKeys: initial, clinicId }: { apiKeys: ApiKey[]; clinicId: string }) {
  const [keys, setKeys] = useState(initial.filter((key) => key.scopes.includes("calendar.feed")));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);

  async function reload() {
    const response = await fetch(`/api/clinic/${clinicId}/integrations/api-keys`, { credentials: "include" });
    const payload = await response.json();
    if (response.ok) setKeys((payload.data as ApiKey[]).filter((key) => key.scopes.includes("calendar.feed")));
  }

  async function create() {
    setCreating(true); setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/integrations/api-keys`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Calendar feed", scopes: ["calendar.feed"] }),
    });
    const payload = await response.json();
    setCreating(false);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to create a calendar feed link."); return; }
    setSubscribeUrl(`${window.location.origin}/api/public/calendar/appointments.ics?key=${payload.data.secret}`);
    await reload();
  }

  async function revoke(keyId: string) {
    setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/integrations/api-keys/${keyId}/revoke`, { method: "POST", credentials: "include" });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? "Unable to revoke this feed link."); return; }
    await reload();
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><CalendarClock size={15} /> Calendar feed</h2>
      <p className="mb-3 text-xs text-slate-500">Subscribe to this clinic&apos;s appointments (7 days back, 60 days ahead) from Google Calendar or any app that supports an .ics URL. The link is a bearer credential — anyone with it can view appointment times and patient first names, so revoke it if it leaks.</p>
      <button onClick={() => void create()} disabled={creating} className="mb-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
        {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} {creating ? "Creating…" : "Create feed link"}
      </button>
      {error && <p role="alert" className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}
      {subscribeUrl && <SecretReveal label="Calendar subscribe URL" value={subscribeUrl} />}
      {keys.length === 0 ? (
        <p className="text-xs text-violet-400">No calendar feed links yet.</p>
      ) : (
        <ul className="space-y-2">
          {keys.map((key) => (
            <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-50 px-3 py-2">
              <p className="text-xs text-violet-400">Created {formatManila(key.createdAt)} · Last used {formatManila(key.lastUsedAt)}</p>
              {key.status === "active" ? (
                <button onClick={() => void revoke(key.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                  <Ban size={12} /> Revoke
                </button>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Revoked</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function todayManila() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function AccountingExportSection({ clinicId }: { clinicId: string }) {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(todayManila);
  const [error, setError] = useState<string | null>(null);

  function download() {
    if (to < from) { setError("The end date must be on or after the start date."); return; }
    if (new Date(to).getTime() - new Date(from).getTime() > 366 * 86_400_000) { setError("Date range cannot exceed 366 days."); return; }
    setError(null);
    window.location.href = `/api/clinic/${clinicId}/integrations/accounting-export.csv?from=${from}&to=${to}`;
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><FileSpreadsheet size={15} /> Accounting export</h2>
      <p className="mb-3 text-xs text-slate-500">A software-agnostic CSV ledger — invoice issued, payment received, refund, and adjustment rows — for import into any Philippine accounting tool. No file binaries, staff accounts, or clinical notes are included.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-violet-700">From
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block rounded-lg border border-violet-200 px-2 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-violet-700">To
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block rounded-lg border border-violet-200 px-2 py-2 text-sm" />
        </label>
        <button onClick={download} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700">
          <FileSpreadsheet size={12} /> Download CSV
        </button>
      </div>
      {error && <p role="alert" className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}
    </section>
  );
}

function ConnectProviderForm({ channel, clinicId, onConnected }: { channel: "email" | "sms"; clinicId: string; onConnected: () => void }) {
  const providerName = channel === "email" ? "sendgrid" : "twilio";
  const [fromAddress, setFromAddress] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(null);
    const credential = channel === "email" ? { apiKey } : { accountSid, authToken };
    const response = await fetch(`/api/clinic/${clinicId}/notification-providers`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, providerName, fromAddress, credential }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to connect this provider."); return; }
    setApiKey(""); setAccountSid(""); setAuthToken(""); setFromAddress("");
    onConnected();
  }

  return (
    <form onSubmit={(event) => { void connect(event); }} className="space-y-2 rounded-xl bg-violet-50 p-3">
      <input
        value={fromAddress}
        onChange={(event) => setFromAddress(event.target.value)}
        placeholder={channel === "email" ? "from@yourclinic.ph" : "+639171234567"}
        className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
      />
      {channel === "email" ? (
        <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="SendGrid API key" className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
      ) : (
        <>
          <input value={accountSid} onChange={(event) => setAccountSid(event.target.value)} placeholder="Twilio Account SID" className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          <input type="password" value={authToken} onChange={(event) => setAuthToken(event.target.value)} placeholder="Twilio Auth Token" className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </>
      )}
      <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} {saving ? "Connecting…" : `Connect ${providerName === "sendgrid" ? "SendGrid" : "Twilio"}`}
      </button>
      {error && <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}
    </form>
  );
}

function NotificationProvidersSection({ providers: initial, clinicId }: { providers: NotificationProviderStatus[]; clinicId: string }) {
  const [providers, setProviders] = useState(initial);
  const [connectingChannel, setConnectingChannel] = useState<"email" | "sms" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const response = await fetch(`/api/clinic/${clinicId}/notification-providers`, { credentials: "include" });
    const payload = await response.json();
    if (response.ok) setProviders(payload.data);
  }

  async function remove(channel: "email" | "sms") {
    setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/notification-providers/${channel}`, { method: "DELETE", credentials: "include" });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? "Unable to disconnect this provider."); return; }
    await reload();
  }

  const byChannel: Record<"email" | "sms", NotificationProviderStatus | undefined> = {
    email: providers.find((p) => p.channel === "email"),
    sms: providers.find((p) => p.channel === "sms"),
  };

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 text-sm font-bold text-violet-900">Notification providers</h2>
      <p className="mb-3 text-xs text-slate-500">Connect your own SendGrid (email) or Twilio (SMS) account so booking confirmations and recall reminders actually send. Credentials are encrypted at rest and never displayed again after saving.</p>
      {error && <p role="alert" className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["email", "sms"] as const).map((channel) => {
          const provider = byChannel[channel];
          const Icon = channel === "email" ? Mail : MessageSquare;
          return (
            <div key={channel} className="rounded-xl border border-violet-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Icon size={14} className="text-violet-500" />
                <span className="text-sm font-semibold text-violet-900 capitalize">{channel}</span>
              </div>
              {provider ? (
                <div className="space-y-1">
                  <p className="text-xs text-slate-600">{provider.providerName === "sendgrid" ? "SendGrid" : "Twilio"} · {provider.fromAddress}</p>
                  <p className="text-xs text-slate-400">Last used {formatManila(provider.lastUsedAt)}</p>
                  {provider.lastError && <p className="text-xs text-red-600">{provider.lastError}</p>}
                  <button onClick={() => void remove(channel)} className="mt-1 flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                    <Ban size={11} /> Disconnect
                  </button>
                </div>
              ) : connectingChannel === channel ? (
                <ConnectProviderForm channel={channel} clinicId={clinicId} onConnected={() => { setConnectingChannel(null); void reload(); }} />
              ) : (
                <button onClick={() => setConnectingChannel(channel)} className="flex items-center gap-1 rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50">
                  <Plus size={11} /> Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function IntegrationsClient({ apiKeys, webhooks, notificationProviders, clinicId }: { apiKeys: ApiKey[]; webhooks: Webhook[]; notificationProviders: NotificationProviderStatus[]; clinicId: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link href="/app/settings" className="rounded-lg p-1.5 text-violet-400 transition-colors hover:bg-violet-100 hover:text-violet-600">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-violet-900">Integrations &amp; API</h1>
          <p className="text-sm text-violet-500">Connect Dentra.ph to external tools with scoped API keys and webhooks.</p>
        </div>
      </div>

      <div className="rounded-xl bg-violet-50 px-4 py-3 text-xs text-violet-600">
        Partner API base: <code className="font-mono">GET /v1/partner/appointments</code> (requires <code className="font-mono">appointments.read</code>) and{" "}
        <code className="font-mono">POST /v1/partner/appointments</code> (requires <code className="font-mono">appointments.write</code>) — send your key in the{" "}
        <code className="font-mono">x-dentra-api-key</code> header. Reads are rate-limited to 120/minute with date ranges capped at 31 days; writes are limited to 30/minute.
      </div>

      <NotificationProvidersSection providers={notificationProviders} clinicId={clinicId} />
      <ApiKeysSection apiKeys={apiKeys} clinicId={clinicId} />
      <WebhooksSection webhooks={webhooks} clinicId={clinicId} />
      <CalendarFeedSection apiKeys={apiKeys} clinicId={clinicId} />
      <AccountingExportSection clinicId={clinicId} />
    </div>
  );
}
