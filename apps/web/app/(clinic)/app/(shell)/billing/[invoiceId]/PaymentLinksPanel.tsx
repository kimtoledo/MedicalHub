"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Copy, Ban, Check } from "lucide-react";

type PaymentLink = {
  id: string;
  amountPhp: string;
  status: "active" | "paid" | "expired" | "cancelled";
  expiresAt: string;
  createdAt: string;
};

const STATUS_STYLES: Record<PaymentLink["status"], string> = {
  active: "bg-violet-100 text-violet-700",
  paid: "bg-emerald-100 text-emerald-700",
  expired: "bg-slate-100 text-slate-500",
  cancelled: "bg-slate-100 text-slate-500",
};

function formatManila(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

export default function PaymentLinksPanel({ clinicId, invoiceId }: { clinicId: string; invoiceId: string }) {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/clinic/${clinicId}/invoices/${invoiceId}/payment-links`, { credentials: "include" });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to load payment links."); return; }
    setError(null);
    setLinks(payload.data);
  }, [clinicId, invoiceId]);

  useEffect(() => { void load(); }, [load]);

  async function createLink() {
    setCreating(true);
    setError(null);
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(`/api/clinic/${clinicId}/invoices/${invoiceId}/payment-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ expiresAt }),
    });
    const payload = await response.json();
    setCreating(false);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to create a payment link."); return; }
    setNewUrl(`${window.location.origin}/pay/${payload.data.token}`);
    setCopied(false);
    void load();
  }

  async function cancelLink(linkId: string) {
    setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/payment-links/${linkId}/cancel`, { method: "POST", credentials: "include" });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? "Unable to cancel this link."); return; }
    void load();
  }

  async function copyUrl() {
    if (!newUrl) return;
    await navigator.clipboard.writeText(newUrl);
    setCopied(true);
  }

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 print:hidden">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-violet-900"><Link2 size={15} /> Payment links</h3>
        <button onClick={() => void createLink()} disabled={creating} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
          {creating ? "Creating…" : "New link"}
        </button>
      </div>

      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}

      {newUrl && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-violet-50 p-3">
          <input readOnly value={newUrl} className="flex-1 truncate bg-transparent text-xs text-violet-800" />
          <button onClick={() => void copyUrl()} className="flex items-center gap-1 rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : links.length === 0 ? (
        <p className="text-xs text-slate-400">No payment links yet for this invoice.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between rounded-xl border border-violet-50 px-3 py-2">
              <div>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[link.status]}`}>{link.status}</span>
                <p className="mt-1 text-xs text-slate-400">Expires {formatManila(link.expiresAt)}</p>
              </div>
              {link.status === "active" && (
                <button onClick={() => void cancelLink(link.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                  <Ban size={12} /> Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
