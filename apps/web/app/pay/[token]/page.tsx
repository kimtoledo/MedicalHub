'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle, AlertTriangle, Ban, RefreshCw } from 'lucide-react';

type LastAttempt = { status: 'pending' | 'succeeded' | 'failed' | 'refunded'; failureReason: string | null; paidAt: string | null };
type PaymentLink = { id: string; invoiceId: string; invoiceNumber: string; amountPhp: string; status: 'active' | 'paid' | 'expired' | 'cancelled'; expiresAt: string; lastAttempt: LastAttempt | null };

function formatPhp(amount: string) {
  return `₱${parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}
function formatManila(iso: string) {
  return new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' });
}

export default function PaymentLinkPage({ params }: { params: { token: string } }) {
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch(`/api/public/payment-links/${params.token}`, { cache: 'no-store' });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) { setError(payload.error?.message ?? 'This payment link could not be found.'); return; }
    setError(null);
    setLink(payload.data);
  }

  useEffect(() => { void load(); }, [params.token]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-violet-900 to-violet-700 px-5 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center text-white">
          <p className="text-sm font-semibold tracking-wide text-violet-200">Dentra.ph</p>
          <h1 className="text-2xl font-extrabold">Invoice Payment</h1>
        </div>
        <section className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          {loading && <p className="py-10 text-center text-sm text-slate-500">Loading payment link…</p>}
          {!loading && error && (
            <div className="space-y-3 text-center">
              <AlertTriangle className="mx-auto text-amber-500" size={44} />
              <h2 className="text-lg font-bold">Link unavailable</h2>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          )}
          {!loading && link && <LinkStatus link={link} onRetry={() => void load()} />}
        </section>
        <p className="mt-6 text-center text-xs text-violet-200">
          Having trouble? Contact the clinic that sent you this link.
        </p>
      </div>
    </main>
  );
}

function LinkStatus({ link, onRetry }: { link: PaymentLink; onRetry: () => void }) {
  const summary = (
    <div className="mb-6 rounded-2xl bg-violet-50 p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">Invoice {link.invoiceNumber}</p>
      <p className="mt-1 text-3xl font-extrabold text-violet-900">{formatPhp(link.amountPhp)}</p>
    </div>
  );

  if (link.status === 'paid') {
    return (
      <div className="space-y-4 text-center">
        {summary}
        <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
        <h2 className="text-lg font-bold">Payment received</h2>
        <p className="text-sm text-slate-500">
          {link.lastAttempt?.paidAt ? `Confirmed on ${formatManila(link.lastAttempt.paidAt)}.` : 'This invoice has already been paid.'} No further action is needed.
        </p>
      </div>
    );
  }

  if (link.status === 'cancelled') {
    return (
      <div className="space-y-4 text-center">
        {summary}
        <Ban className="mx-auto text-slate-400" size={48} />
        <h2 className="text-lg font-bold">Link no longer available</h2>
        <p className="text-sm text-slate-500">The clinic cancelled this payment link. Please ask them for a new one.</p>
      </div>
    );
  }

  if (link.status === 'expired') {
    return (
      <div className="space-y-4 text-center">
        {summary}
        <Clock3 className="mx-auto text-slate-400" size={48} />
        <h2 className="text-lg font-bold">Link expired</h2>
        <p className="text-sm text-slate-500">This payment link expired on {formatManila(link.expiresAt)}. Please ask the clinic to send a new one.</p>
      </div>
    );
  }

  // status === 'active'
  if (link.lastAttempt?.status === 'pending') {
    return (
      <div className="space-y-4 text-center">
        {summary}
        <Clock3 className="mx-auto animate-pulse text-violet-500" size={48} />
        <h2 className="text-lg font-bold">Confirming your payment…</h2>
        <p className="text-sm text-slate-500">We&apos;re waiting for confirmation from your payment provider. This page will update automatically once it&apos;s confirmed.</p>
        <button onClick={onRetry} className="mx-auto flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">
          <RefreshCw size={14} /> Check status
        </button>
      </div>
    );
  }

  if (link.lastAttempt?.status === 'failed') {
    return (
      <div className="space-y-4 text-center">
        {summary}
        <XCircle className="mx-auto text-red-500" size={48} />
        <h2 className="text-lg font-bold">Payment didn&apos;t go through</h2>
        <p className="text-sm text-slate-500">{link.lastAttempt.failureReason ?? 'Your last payment attempt was unsuccessful.'} You can try again below.</p>
        <p className="text-xs text-slate-400">Expires {formatManila(link.expiresAt)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      {summary}
      <h2 className="text-lg font-bold">Ready for payment</h2>
      <p className="text-sm text-slate-500">
        Online checkout for this clinic is being finalized with our payment partners. Please pay in person or ask the clinic which payment
        channels (GCash, Maya, card) are currently supported for this invoice.
      </p>
      <p className="text-xs text-slate-400">Link expires {formatManila(link.expiresAt)}</p>
    </div>
  );
}
