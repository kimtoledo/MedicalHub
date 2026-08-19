'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Gauge, Loader2, Send } from 'lucide-react';

type Entitlement = {
  featureKey: string;
  isEnabled: boolean;
};

type SubscriptionRequest = {
  id: string;
  type: 'upgrade' | 'downgrade' | 'addon';
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedMetric?: string | null;
  requestedLimit?: number | null;
  createdAt: string;
};

type CapacityItem = { metric: string; limit: number | null; used: number };

type SubscriptionData = {
  entitlement: {
    subscription: { package: { name: string } } | null;
    entitlements: Entitlement[];
  } | null;
  requests: SubscriptionRequest[];
  capacity: CapacityItem[];
};

type RequestType = 'upgrade' | 'downgrade' | 'addon';

function formatMetric(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function SubscriptionClient({ clinicId }: { clinicId: string }) {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [type, setType] = useState<RequestType>('upgrade');
  const [reason, setReason] = useState('');
  const [metric, setMetric] = useState('');
  const [desiredLimit, setDesiredLimit] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clinic/${clinicId}/subscription`, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((p) => setData(p.data));
  }, [clinicId]);

  const currentLimitForMetric = data?.capacity.find((item) => item.metric === metric)?.limit ?? 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const body: Record<string, unknown> = { type, reason };
    if (type === 'addon') {
      body.requestedMetric = metric;
      body.requestedLimit = desiredLimit;
    }
    const response = await fetch(`/api/clinic/${clinicId}/subscription/requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    setBusy(false);
    if (response?.ok) {
      setMessage('Request submitted for Super Admin review.');
      setReason('');
      setMetric('');
      const refreshed = await fetch(`/api/clinic/${clinicId}/subscription`, { credentials: 'include', cache: 'no-store' }).then((r) => r.json()).catch(() => null);
      if (refreshed?.data) setData(refreshed.data);
    } else {
      const payload = await response?.json().catch(() => ({})) as { error?: { message?: string } };
      setMessage(payload?.error?.message ?? 'Unable to submit request.');
    }
  }

  if (!data) return <div className="p-8"><Loader2 className="animate-spin text-violet-600" /></div>;

  const pendingRequest = data.requests.find((request) => request.status === 'pending');

  return (
    <div className="max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
        <p className="mt-1 text-sm text-slate-500">Your package and feature access are managed securely by Dentra.</p>
      </div>

      <section className="rounded-2xl border border-violet-100 bg-white p-5">
        <p className="text-sm text-slate-500">Current package</p>
        <h2 className="mt-1 text-xl font-bold text-violet-900">{data.entitlement?.subscription?.package?.name ?? 'No active package'}</h2>
        <p className="mt-1 text-sm text-slate-500">{data.entitlement?.entitlements?.filter((item) => item.isEnabled).length ?? 0} enabled features</p>
      </section>

      {data.capacity.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white">
          <div className="flex items-center gap-2 border-b border-violet-100 px-5 py-4">
            <Gauge size={18} className="text-violet-600" />
            <h2 className="font-bold text-slate-900">Seats & capacity</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {data.capacity.map((item) => {
              const atCap = item.limit !== null && item.used >= item.limit;
              return (
                <div key={item.metric} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-medium text-slate-700">{formatMetric(item.metric)}</span>
                  <span className={`font-mono ${atCap ? 'font-bold text-amber-600' : 'text-slate-600'}`}>
                    {item.used} / {item.limit === null ? '∞' : item.limit}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-violet-100 bg-white p-5">
        <h2 className="font-bold text-slate-900">Request a package change</h2>
        {pendingRequest ? (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            A {pendingRequest.type} request is already pending Super Admin review.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">What do you need?</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as RequestType)}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value="upgrade">Upgrade my plan</option>
                <option value="downgrade">Downgrade my plan</option>
                <option value="addon">Add extra seats to my current plan</option>
              </select>
            </label>

            {type === 'addon' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Seat type</span>
                  <select
                    value={metric}
                    onChange={(event) => { const next = event.target.value; setMetric(next); const current = data.capacity.find((item) => item.metric === next)?.limit ?? 0; setDesiredLimit(current + 1); }}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                    required
                  >
                    <option value="" disabled>Select a seat type</option>
                    {data.capacity.map((item) => (
                      <option key={item.metric} value={item.metric}>{formatMetric(item.metric)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">New total seats needed</span>
                  <input
                    type="number"
                    min={currentLimitForMetric + 1}
                    value={desiredLimit}
                    onChange={(event) => setDesiredLimit(Math.max(currentLimitForMetric + 1, Number(event.target.value)))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                    required
                  />
                  {metric && <p className="mt-1 text-xs text-slate-400">Currently: {currentLimitForMetric}</p>}
                </label>
              </div>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Reason</span>
              <textarea
                aria-label="Reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Tell us what your clinic needs"
                minLength={3}
                maxLength={1000}
                className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm"
                required
              />
            </label>
            <button
              type="submit"
              disabled={busy || reason.trim().length < 3 || (type === 'addon' && !metric)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Submit request
            </button>
          </form>
        )}
        {message && <p className="mt-3 text-sm text-violet-700">{message}</p>}
      </section>
    </div>
  );
}
