"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Loader2, AlertCircle } from "lucide-react";
import type { HmoPayer } from "./types";

export default function NewClaimClient({
  clinicId,
  payers,
}: {
  clinicId: string;
  payers: HmoPayer[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    patientId: "",
    hmoPayer: "",
    payerNameSnapshot: "",
    membershipId: "",
    invoiceId: "",
    encounterId: "",
    loaCode: "",
    claimAmountPhp: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.value;
      setForm((f) => {
        const next = { ...f, [key]: val };
        // Auto-fill payer name snapshot when payer is selected
        if (key === "hmoPayer") {
          const payer = payers.find((p) => p.id === val);
          next.payerNameSnapshot = payer?.name ?? f.payerNameSnapshot;
        }
        return next;
      });
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientId.trim()) { setError("Patient ID is required."); return; }
    if (!form.payerNameSnapshot.trim()) { setError("Payer name is required."); return; }
    if (!form.claimAmountPhp || isNaN(parseFloat(form.claimAmountPhp))) {
      setError("Claim amount must be a valid number.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const body: Record<string, string> = {
      patientId: form.patientId.trim(),
      payerNameSnapshot: form.payerNameSnapshot.trim(),
      claimAmountPhp: parseFloat(form.claimAmountPhp).toFixed(2),
    };
    if (form.hmoPayer) body.hmoPayer = form.hmoPayer;
    if (form.membershipId.trim()) body.membershipId = form.membershipId.trim();
    if (form.invoiceId.trim()) body.invoiceId = form.invoiceId.trim();
    if (form.encounterId.trim()) body.encounterId = form.encounterId.trim();
    if (form.loaCode.trim()) body.loaCode = form.loaCode.trim();
    if (form.notes.trim()) body.notes = form.notes.trim();

    const res = await fetch(`/api/clinic/${clinicId}/hmo/claims`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { success: boolean; data?: { id: string }; error?: { message: string } };
    setSubmitting(false);

    if (!res.ok || !json.success) {
      setError(json.error?.message ?? "Failed to create claim.");
      return;
    }

    router.push(`/app/billing/hmo-claims/${json.data!.id}`);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-6">
      <div>
        <Link href="/app/billing/hmo-claims"
          className="inline-flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 mb-2">
          <ArrowLeft size={15} /> HMO Claims
        </Link>
        <h1 className="text-xl font-bold text-violet-900">New HMO Claim</h1>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-violet-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={16} className="text-violet-500" />
          <h2 className="font-semibold text-sm text-violet-900">Claim Details</h2>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-violet-700 mb-1">Patient ID (UUID) *</label>
            <input
              required
              value={form.patientId}
              onChange={set("patientId")}
              placeholder="Paste patient UUID from their profile"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono"
            />
            <p className="text-[10px] text-violet-400 mt-0.5">
              Copy from the patient's profile URL or record.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">HMO Payer</label>
            <select
              value={form.hmoPayer}
              onChange={set("hmoPayer")}
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">Select payer…</option>
              {payers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="">— Other —</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">Payer Name *</label>
            <input
              required
              value={form.payerNameSnapshot}
              onChange={set("payerNameSnapshot")}
              placeholder="e.g. Maxicare"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">LOA / Approval Code</label>
            <input
              value={form.loaCode}
              onChange={set("loaCode")}
              placeholder="e.g. LOA-2024-00001"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">Claim Amount (PHP) *</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.claimAmountPhp}
              onChange={set("claimAmountPhp")}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">Invoice ID (optional)</label>
            <input
              value={form.invoiceId}
              onChange={set("invoiceId")}
              placeholder="Invoice UUID"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">Encounter ID (optional)</label>
            <input
              value={form.encounterId}
              onChange={set("encounterId")}
              placeholder="Encounter UUID"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-violet-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              placeholder="Special instructions, additional info…"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Creating…" : "Create Claim"}
          </button>
          <Link href="/app/billing/hmo-claims"
            className="px-4 py-2.5 text-sm text-violet-500 hover:text-violet-700">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
