"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, CreditCard, CheckCircle, RotateCcw, Shield, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { InvoiceDetail } from "./page";
import PaymentLinksPanel from "./PaymentLinksPanel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPhp(amount: string) {
  return `₱${parseFloat(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  gcash: "GCash",
  card: "Credit/Debit Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

function todayManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ---------------------------------------------------------------------------
// Record Payment modal
// ---------------------------------------------------------------------------
function RecordPaymentModal({
  invoice,
  clinicId,
  onClose,
  onSuccess,
}: {
  invoice: InvoiceDetail;
  clinicId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(invoice.balancePhp ?? invoice.totalAmountPhp);
  const [date, setDate] = useState(todayManila());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinic/${clinicId}/invoices/${invoice.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amountPhp: amount,
          paymentMethod: method,
          paymentDate: date,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? "Payment failed");
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CreditCard size={18} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-violet-900">Record Payment</h2>
            <p className="text-xs text-violet-400">
              {invoice.invoiceNumber} · {formatPhp(invoice.totalAmountPhp)}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { void submit(e); }} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-violet-600 mb-1">Amount</label>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm text-violet-900 font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-600 mb-1">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="card">Credit / Debit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-600 mb-1">Payment Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-600 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reference number, etc."
              className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-violet-200 text-violet-600 text-sm font-semibold hover:bg-violet-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? "Processing…" : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------
function RecordTransactionModal({ invoice, clinicId, type, onClose, onSuccess }: { invoice: InvoiceDetail; clinicId: string; type: "refund" | "adjustment"; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayManila());
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/invoices/${invoice.id}/${type}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ amountPhp: amount, transactionDate: date, reason, ...(type === "refund" ? { paymentMethod: method } : {}) }) });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? `Unable to record ${type}.`); setLoading(false); return; }
    setLoading(false); onSuccess();
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}><div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><h2 className="font-bold capitalize text-violet-900">Record {type}</h2>{error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}<form onSubmit={(event) => { void submit(event); }} className="space-y-3"><label className="block text-xs font-semibold text-violet-600">Amount<input required value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm" /></label>{type === "refund" && <label className="block text-xs font-semibold text-violet-600">Refund method<select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"><option value="cash">Cash</option><option value="gcash">GCash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></label>}<label className="block text-xs font-semibold text-violet-600">Date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm" /></label><label className="block text-xs font-semibold text-violet-600">Reason<textarea required minLength={3} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm" /></label><div className="flex gap-2"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-600">Cancel</button><button disabled={loading} className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Saving…" : "Save transaction"}</button></div></form></div></div>;
}

export default function InvoiceDetailClient({
  invoice: initialInvoice,
  clinicId,
}: {
  invoice: InvoiceDetail;
  clinicId: string;
}) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [showPayModal, setShowPayModal] = useState(false);
  const [transactionType, setTransactionType] = useState<"refund" | "adjustment" | null>(null);
  const [paymentRecorded, setPaymentRecorded] = useState(false);

  useEffect(() => {
    setInvoice(initialInvoice);
  }, [initialInvoice]);

  const isPaid    = invoice.status === "paid";
  const isPending = invoice.status === "pending" || invoice.status === "partially_paid";

  function handlePaySuccess() {
    setShowPayModal(false);
    setPaymentRecorded(true);
    router.refresh();
  }

  return (
    <>
      {showPayModal && (
        <RecordPaymentModal
          invoice={invoice}
          clinicId={clinicId}
          onClose={() => setShowPayModal(false)}
          onSuccess={handlePaySuccess}
        />
      )}
      {transactionType && <RecordTransactionModal invoice={invoice} clinicId={clinicId} type={transactionType} onClose={() => setTransactionType(null)} onSuccess={() => { setTransactionType(null); router.refresh(); }} />}

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        {paymentRecorded && (
          <div role="status" className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-bold">Payment recorded</p><p className="text-xs text-emerald-700">This visit is complete. Continue with the next patient or arrange a follow-up.</p></div>
            <div className="flex flex-wrap gap-2"><Link href="/app" className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Back to Today</Link><Link href="/app/appointments" className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800">Schedule follow-up</Link></div>
          </div>
        )}
        {/* Back + actions */}
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link
            href="/app/billing"
            className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700"
          >
            <ArrowLeft size={15} /> Back to Billing
          </Link>
          <div className="flex gap-2">
            {isPending && (
              <Link
                href={`/app/billing/hmo-claims/new?patientId=${invoice.patient.id}&invoiceId=${invoice.id}${invoice.encounterId ? `&encounterId=${invoice.encounterId}` : ""}`}
                className="flex items-center gap-1.5 rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
              >
                <Shield size={14} /> HMO Claim
              </Link>
            )}
            {isPending && (
              <button
                onClick={() => setShowPayModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <CreditCard size={14} /> Record Payment
              </button>
            )}
            {(invoice.status === "paid" || invoice.status === "partially_paid") && <button onClick={() => setTransactionType("refund")} className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"><RotateCcw size={14} /> Refund</button>}
            {isPending && <button onClick={() => setTransactionType("adjustment")} className="flex items-center gap-1.5 rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700"><SlidersHorizontal size={14} /> Adjustment</button>}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Printer size={14} /> Print / PDF
            </button>
          </div>
        </div>

        {/* Receipt card */}
        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden print:shadow-none print:border-0">
          {/* Clinic header */}
          <div className="bg-violet-900 text-white px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {invoice.clinic.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={invoice.clinic.logoUrl}
                    alt={invoice.clinic.name}
                    className="w-12 h-12 rounded-xl object-contain bg-white/10 p-1 flex-shrink-0"
                  />
                ) : (
                  /* Deterministic placeholder: first letter of clinic name on a muted violet bg */
                  <div
                    className="w-12 h-12 rounded-xl bg-violet-700 flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <span className="text-white text-xl font-bold leading-none select-none">
                      {invoice.clinic.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{invoice.clinic.name}</h2>
                  {(invoice.clinic.address || invoice.clinic.city) && (
                    <p className="text-violet-300 text-xs mt-0.5">
                      {[invoice.clinic.address, invoice.clinic.city].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {invoice.clinic.phone && (
                    <p className="text-violet-300 text-xs">{invoice.clinic.phone}</p>
                  )}
                  <p className="text-violet-400 text-xs mt-1">Official Receipt</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono text-lg font-bold text-white">{invoice.invoiceNumber}</p>
                <p className="text-violet-300 text-xs mt-0.5">
                  {invoice.issuedAt
                    ? new Date(invoice.issuedAt).toLocaleDateString("en-PH", { dateStyle: "long" })
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Status banner */}
          {isPaid && (
            <div className="bg-emerald-50 border-b border-emerald-100 px-8 py-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              <span className="text-emerald-700 text-sm font-semibold">
                Paid
                {invoice.payment && (
                  <>
                    {" · "}
                    {new Date(invoice.payment.paymentDate).toLocaleDateString("en-PH")}
                    {" · "}
                    {METHOD_LABELS[invoice.payment.paymentMethod] ?? invoice.payment.paymentMethod}
                  </>
                )}
              </span>
            </div>
          )}
          {isPending && (
            <div className="bg-amber-50 border-b border-amber-100 px-8 py-3">
              <span className="text-amber-700 text-sm font-semibold">⏳ Payment Pending</span>
            </div>
          )}

          {/* Patient info */}
          <div className="px-8 py-5 border-b border-violet-50">
            <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-2">Bill To</p>
            <p className="font-semibold text-violet-900">
              {invoice.patient.firstName} {invoice.patient.lastName}
            </p>
            <p className="text-violet-500 font-mono text-xs mt-0.5">{invoice.patient.patientNumber}</p>
          </div>

          {/* Line items */}
          <div className="px-8 py-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-violet-400 font-semibold border-b border-violet-100">
                  <th className="pb-2 text-left">Description</th>
                  <th className="pb-2 text-center w-16">Tooth</th>
                  <th className="pb-2 text-right w-12">Qty</th>
                  <th className="pb-2 text-right w-28">Unit Price</th>
                  <th className="pb-2 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-50">
                {invoice.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-violet-300 text-xs">
                      No line items
                    </td>
                  </tr>
                ) : (
                  invoice.lineItems.map((li) => (
                    <tr key={li.id}>
                      <td className="py-2.5 text-violet-800 font-medium">{li.description}</td>
                      <td className="py-2.5 text-center text-violet-400 text-xs">{li.toothRef ?? "—"}</td>
                      <td className="py-2.5 text-right text-violet-600">{li.quantity}</td>
                      <td className="py-2.5 text-right text-violet-600">{formatPhp(li.unitPricePhp)}</td>
                      <td className="py-2.5 text-right font-semibold text-violet-900">
                        {formatPhp(li.totalPhp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr><td colSpan={4} className="pt-3 text-right text-sm text-violet-500">Subtotal</td><td className="pt-3 text-right text-sm text-violet-700">{formatPhp(invoice.subtotalPhp ?? invoice.totalAmountPhp)}</td></tr>
                {Number(invoice.discountAmountPhp ?? 0) > 0 && <tr><td colSpan={4} className="text-right text-sm text-emerald-600">Discount</td><td className="text-right text-sm text-emerald-600">−{formatPhp(invoice.discountAmountPhp ?? "0")}</td></tr>}
                <tr className="border-t-2 border-violet-200">
                  <td colSpan={4} className="pt-3 text-right font-bold text-violet-900 pr-4 text-base">
                    Total
                  </td>
                  <td className="pt-3 text-right font-bold text-violet-900 text-base">
                    {formatPhp(invoice.totalAmountPhp)}
                  </td>
                </tr>
                <tr><td colSpan={4} className="pt-2 text-right font-bold text-violet-900">Remaining balance</td><td className="pt-2 text-right font-bold text-amber-700">{formatPhp(invoice.balancePhp ?? invoice.totalAmountPhp)}</td></tr>
              </tfoot>
            </table>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-violet-50/50 border-t border-violet-100">
            <p className="text-xs text-violet-400 text-center">
              Thank you for choosing {invoice.clinic.name}. This is your official receipt.
            </p>
          </div>
        </div>

        {isPending && <PaymentLinksPanel clinicId={clinicId} invoiceId={invoice.id} />}
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </>
  );
}
