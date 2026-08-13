"use client";

import { useState } from "react";
import {
  Globe, Plus, Copy, Check, RefreshCw, ShieldCheck,
  AlertCircle, ChevronLeft, Clock3, XCircle, Loader2,
} from "lucide-react";
import Link from "next/link";
import type { CustomDomain } from "./page";

const STATUS_META: Record<CustomDomain["status"], { label: string; className: string }> = {
  pending_verification: { label: "Pending verification", className: "bg-amber-100 text-amber-700" },
  verified: { label: "Verified — ready to activate", className: "bg-violet-100 text-violet-700" },
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Verification failed", className: "bg-red-100 text-red-700" },
  disabled: { label: "Disabled", className: "bg-slate-100 text-slate-500" },
};

function formatManila(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

function DnsInstructions({ domain }: { domain: CustomDomain }) {
  const [copied, setCopied] = useState<"name" | "value" | null>(null);

  async function copy(field: "name" | "value", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl bg-violet-50 p-3 text-xs">
      <p className="font-semibold text-violet-700">Add this TXT record at your DNS provider, then recheck:</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-violet-400">Name</p>
            <p className="truncate font-mono text-violet-800">_dentra-verification</p>
          </div>
          <button onClick={() => void copy("name", "_dentra-verification")} className="flex-shrink-0 text-violet-400 hover:text-violet-600">
            {copied === "name" ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-violet-400">Value</p>
            <p className="truncate font-mono text-violet-800">{domain.verificationToken}</p>
          </div>
          <button onClick={() => void copy("value", domain.verificationToken)} className="flex-shrink-0 text-violet-400 hover:text-violet-600">
            {copied === "value" ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>
      <p className="text-violet-500">DNS changes can take up to a few hours to propagate before a recheck succeeds.</p>
    </div>
  );
}

export default function DomainsClient({ domains: initial, clinicId }: { domains: CustomDomain[]; clinicId: string }) {
  const [domains, setDomains] = useState<CustomDomain[]>(initial);
  const [hostname, setHostname] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    const response = await fetch(`/api/clinic/${clinicId}/custom-domains`, { credentials: "include" });
    const payload = await response.json();
    if (response.ok) setDomains(payload.data);
  }

  async function addDomain(event: React.FormEvent) {
    event.preventDefault();
    if (!hostname.trim()) return;
    setAdding(true);
    setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/custom-domains`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname: hostname.trim() }),
    });
    const payload = await response.json();
    setAdding(false);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to add this domain."); return; }
    setHostname("");
    await reload();
  }

  async function verify(domainId: string) {
    setBusyId(domainId);
    setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/custom-domains/${domainId}/verify`, { method: "POST", credentials: "include" });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? "Unable to recheck DNS."); return; }
    await reload();
  }

  async function activate(domainId: string) {
    setBusyId(domainId);
    setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/custom-domains/${domainId}/activate`, { method: "POST", credentials: "include" });
    setBusyId(null);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? "Unable to activate this domain."); return; }
    await reload();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link href="/app/settings" className="rounded-lg p-1.5 text-violet-400 transition-colors hover:bg-violet-100 hover:text-violet-600">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-violet-900">Custom Domain</h1>
          <p className="text-sm text-violet-500">Point your own domain at your Dentra.ph microsite.</p>
        </div>
      </div>

      <form onSubmit={(event) => { void addDomain(event); }} className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-white p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-violet-700">Domain</label>
          <input
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            placeholder="www.smiledental.ph"
            className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <button disabled={adding} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60">
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {adding ? "Adding…" : "Add domain"}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="rounded-2xl border border-violet-100 bg-white">
        {domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14">
            <Globe size={32} className="text-violet-200" />
            <p className="text-sm font-medium text-violet-400">No custom domain configured</p>
            <p className="text-xs text-violet-300">Your microsite is available at your Dentra.ph URL until you add one.</p>
          </div>
        ) : (
          <ul className="divide-y divide-violet-50">
            {domains.map((domain) => {
              const meta = STATUS_META[domain.status];
              const busy = busyId === domain.id;
              return (
                <li key={domain.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-violet-400" />
                        <span className="font-semibold text-violet-900">{domain.hostname}</span>
                      </div>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                      {domain.status === "failed" && domain.failureReason && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><XCircle size={12} /> {domain.failureReason}</p>
                      )}
                      {domain.lastCheckedAt && <p className="mt-1 text-xs text-violet-400">Last checked {formatManila(domain.lastCheckedAt)}</p>}
                      {domain.status === "active" && domain.activatedAt && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600"><ShieldCheck size={12} /> Activated {formatManila(domain.activatedAt)}</p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      {(domain.status === "pending_verification" || domain.status === "failed") && (
                        <button onClick={() => void verify(domain.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60">
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Recheck DNS
                        </button>
                      )}
                      {domain.status === "verified" && (
                        <button onClick={() => void activate(domain.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Activate
                        </button>
                      )}
                    </div>
                  </div>

                  {domain.status !== "active" && domain.status !== "disabled" && <DnsInstructions domain={domain} />}

                  {domain.status === "active" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock3 size={12} /> SSL and canonical redirect are provisioned by our infrastructure after activation and can take some time to propagate. If DNS ever breaks or the certificate lapses, your microsite automatically falls back to its Dentra.ph URL with no downtime.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
