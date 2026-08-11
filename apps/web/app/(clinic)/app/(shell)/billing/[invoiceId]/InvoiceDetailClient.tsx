"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, CreditCard, CheckCircle } from "lucide-react";
import Link from "next/link";
import type { InvoiceDetail } from "./page";

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
          amountPhp: invoice.totalAmountPhp,
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
              readOnly
              value={formatPhp(invoice.totalAmountPhp)}
              className="w-full px-3 py-2 rounded-lg border border-violet-100 bg-violet-50 text-sm text-violet-900 font-semibold"
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

  const isPaid    = invoice.status === "paid";
  const isPending = invoice.status === "pending";

  function handlePaySuccess() {
    setShowPayModal(false);
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

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
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
              <button
                onClick={() => setShowPayModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <CreditCard size={14} /> Record Payment
              </button>
            )}
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
                <tr className="border-t-2 border-violet-200">
                  <td colSpan={4} className="pt-3 text-right font-bold text-violet-900 pr-4 text-base">
                    Total
                  </td>
                  <td className="pt-3 text-right font-bold text-violet-900 text-base">
                    {formatPhp(invoice.totalAmountPhp)}
                  </td>
                </tr>
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
