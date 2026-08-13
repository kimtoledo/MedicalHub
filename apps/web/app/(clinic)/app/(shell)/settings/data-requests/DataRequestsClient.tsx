"use client";

import { useState } from "react";
import {
  LifeBuoy, DatabaseBackup, Loader2, AlertCircle, ChevronLeft, Download,
} from "lucide-react";
import Link from "next/link";
import type { SupportAccessRequest, TenantExportRequest } from "./page";

const SUPPORT_STATUS_STYLES: Record<SupportAccessRequest["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-500",
  used: "bg-violet-100 text-violet-700",
};

const EXPORT_STATUS_STYLES: Record<TenantExportRequest["status"], string> = {
  requested: "bg-amber-100 text-amber-700",
  processing: "bg-violet-100 text-violet-700",
  ready: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function formatManila(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

export default function DataRequestsClient({ supportAccess: initialSupport, exports: initialExports, clinicId }: { supportAccess: SupportAccessRequest[]; exports: TenantExportRequest[]; clinicId: string }) {
  const [supportAccess, setSupportAccess] = useState(initialSupport);
  const [exportRequests, setExportRequests] = useState(initialExports);
  const [reason, setReason] = useState("");
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [submittingExport, setSubmittingExport] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const [supportRes, exportRes] = await Promise.all([
      fetch(`/api/clinic/${clinicId}/operations/support-access`, { credentials: "include" }),
      fetch(`/api/clinic/${clinicId}/operations/exports`, { credentials: "include" }),
    ]);
    if (supportRes.ok) setSupportAccess((await supportRes.json()).data);
    if (exportRes.ok) setExportRequests((await exportRes.json()).data);
  }

  async function submitSupport(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 10) { setError("Please describe the issue in at least 10 characters."); return; }
    setSubmittingSupport(true); setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/operations/support-access`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    const payload = await response.json();
    setSubmittingSupport(false);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to submit this request."); return; }
    setReason("");
    await reload();
  }

  async function submitExport() {
    setSubmittingExport(true); setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/operations/exports`, { method: "POST", credentials: "include" });
    const payload = await response.json();
    setSubmittingExport(false);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to submit this request."); return; }
    await reload();
  }

  async function download(requestId: string) {
    setDownloadingId(requestId); setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/operations/exports/${requestId}/download-url`, { credentials: "include" });
    const payload = await response.json();
    setDownloadingId(null);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to get a download link."); return; }
    window.location.href = payload.data.downloadUrl;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link href="/app/settings" className="rounded-lg p-1.5 text-violet-400 transition-colors hover:bg-violet-100 hover:text-violet-600">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-violet-900">Support &amp; Data Requests</h1>
          <p className="text-sm text-violet-500">Ask Dentra.ph support for help, or request a full export of your clinic&apos;s data.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <section className="rounded-2xl border border-violet-100 bg-white p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><LifeBuoy size={15} /> Request support access</h2>
        <p className="mb-3 text-xs text-slate-500">Describe the issue so support can help. We never open your clinical records without your written justification and a Super Admin approval, and access is time-limited once granted.</p>
        <form onSubmit={(event) => { void submitSupport(event); }} className="mb-4 space-y-2">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="What do you need help with?"
            className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <button disabled={submittingSupport} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
            {submittingSupport ? <Loader2 size={14} className="animate-spin" /> : null} {submittingSupport ? "Submitting…" : "Submit request"}
          </button>
        </form>
        {supportAccess.length === 0 ? (
          <p className="text-xs text-violet-400">No support requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {supportAccess.map((request) => (
              <li key={request.id} className="rounded-xl border border-violet-50 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-600">{request.reason}</p>
                    <p className="text-xs text-slate-400">{formatManila(request.createdAt)}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${SUPPORT_STATUS_STYLES[request.status]}`}>{request.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-violet-100 bg-white p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><DatabaseBackup size={15} /> Export your clinic&apos;s data</h2>
        <p className="mb-3 text-xs text-slate-500">Request a structured JSON export of your clinic&apos;s records. Our platform team reviews and generates each export; uploaded file binaries (radiographs/photos) and staff accounts are not included.</p>
        <button onClick={() => void submitExport()} disabled={submittingExport} className="mb-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
          {submittingExport ? <Loader2 size={14} className="animate-spin" /> : null} {submittingExport ? "Submitting…" : "Request export"}
        </button>
        {exportRequests.length === 0 ? (
          <p className="text-xs text-violet-400">No export requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {exportRequests.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-2 rounded-xl border border-violet-50 px-3 py-2">
                <div>
                  <p className="text-xs text-slate-500">Requested {formatManila(request.requestedAt)}</p>
                  {request.retentionUntil && <p className="text-xs text-slate-400">Retention until {formatManila(request.retentionUntil)}</p>}
                  {request.failureReason && <p className="text-xs text-red-600">{request.failureReason}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${EXPORT_STATUS_STYLES[request.status]}`}>{request.status}</span>
                  {request.status === "ready" && request.artifactReference && (
                    <button onClick={() => void download(request.id)} disabled={downloadingId === request.id} className="flex items-center gap-1 rounded-lg bg-violet-600 px-2 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                      {downloadingId === request.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Download
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
