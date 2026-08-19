'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Settings, Server, ShieldCheck, AlertCircle, Loader2, LogOut } from 'lucide-react';

type RuntimeSummary = { nodeEnv: string; appVersion: string; uptimeSeconds: number; serverTimeUtc: string; databaseConnected: boolean };
type PlatformSettings = { id: string; supportEmail: string | null; supportPhone: string | null; maintenanceBannerEnabled: boolean; maintenanceBannerMessage: string | null; updatedAt: string };
type SessionSummary = { id: string; token: string; createdAt: string; expiresAt: string; ipAddress: string | null; userAgent: string | null };

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function RuntimeSummarySection() {
  const [summary, setSummary] = useState<RuntimeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const response = await fetch('/api/admin/settings/runtime', { cache: 'no-store' });
      setLoading(false);
      if (response.ok) setSummary((await response.json()).data);
    })();
  }, []);

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><Server size={15} /> Runtime summary</h2>
      <p className="mb-3 text-xs text-slate-500">Read-only. No secrets, database credentials, or environment variables are shown here.</p>
      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : !summary ? (
        <p className="text-xs text-red-600">Unable to load the runtime summary.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Environment', summary.nodeEnv],
            ['App version', summary.appVersion],
            ['Uptime', formatUptime(summary.uptimeSeconds)],
            ['Database', summary.databaseConnected ? 'Connected' : 'Unavailable'],
          ].map(([label, value]) => (
            <div key={label} className={`rounded-xl p-3 ${label === 'Database' && !summary.databaseConnected ? 'bg-red-50' : 'bg-slate-50'}`}>
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <p className="text-sm font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PlatformDefaultsSection() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/settings/platform', { cache: 'no-store' });
    setLoading(false);
    if (!response.ok) { setError('Unable to load platform settings.'); return; }
    const data = (await response.json()).data as PlatformSettings;
    setSettings(data);
    setSupportEmail(data.supportEmail ?? '');
    setSupportPhone(data.supportPhone ?? '');
    setBannerEnabled(data.maintenanceBannerEnabled);
    setBannerMessage(data.maintenanceBannerMessage ?? '');
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setMessage(null);
    const response = await fetch('/api/admin/settings/platform', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supportEmail: supportEmail || null, supportPhone: supportPhone || null, maintenanceBannerEnabled: bannerEnabled, maintenanceBannerMessage: bannerMessage || null }) });
    setSaving(false);
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? 'Unable to save these settings.'); return; }
    setMessage('Platform settings saved.');
    await load();
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-900"><Settings size={15} /> Platform defaults</h2>
      <p className="mb-3 text-xs text-slate-500">Public support details and operational toggles. Every change here is recorded to the immutable audit trail.</p>
      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Support email<input type="email" value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} placeholder="help@dentra.ph" className="mt-1 h-10 w-full rounded-lg border border-violet-200 px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Support phone<input value={supportPhone} onChange={(event) => setSupportPhone(event.target.value)} placeholder="+63 2 8000 0000" className="mt-1 h-10 w-full rounded-lg border border-violet-200 px-3 text-sm" /></label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2"><input type="checkbox" checked={bannerEnabled} onChange={(event) => setBannerEnabled(event.target.checked)} /> Show a platform-wide maintenance banner</label>
          {bannerEnabled && <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Banner message<textarea maxLength={500} value={bannerMessage} onChange={(event) => setBannerMessage(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm" /></label>}
          <button disabled={saving} className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 sm:col-span-2">{saving ? 'Saving…' : 'Save settings'}</button>
          {settings && <p className="text-xs text-slate-400 sm:col-span-2">Last updated {new Date(settings.updatedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}</p>}
        </form>
      )}
      {error && <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}
      {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">{message}</p>}
    </section>
  );
}

function SessionSecuritySection() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/settings/sessions', { cache: 'no-store' });
    setLoading(false);
    if (response.status === 501) { setUnsupported(true); return; }
    if (!response.ok) { setError('Unable to load your sessions.'); return; }
    setSessions((await response.json()).data);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function revoke(token: string) {
    setBusy(true); setError(null);
    const response = await fetch('/api/admin/settings/sessions/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    setBusy(false);
    if (!response.ok) { setError('Unable to revoke this session.'); return; }
    await load();
  }

  async function revokeOthers() {
    setBusy(true); setError(null);
    const response = await fetch('/api/admin/settings/sessions/revoke-others', { method: 'POST' });
    setBusy(false);
    if (!response.ok) { setError('Unable to sign out other devices.'); return; }
    await load();
  }

  if (unsupported) return null;

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-violet-900"><ShieldCheck size={15} /> Session security</h2>
        {sessions.length > 1 && <button onClick={() => void revokeOthers()} disabled={busy} className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"><LogOut size={12} /> Sign out other devices</button>}
      </div>
      <p className="mb-3 text-xs text-slate-500">Active sessions for your own Super Admin account.</p>
      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="text-xs text-slate-400">No active sessions.</p>
      ) : (
        <ul className="space-y-1.5">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-slate-700">{session.userAgent ?? 'Unknown device'}</p>
                <p className="text-xs text-slate-400">{session.ipAddress ?? 'Unknown IP'} · expires {new Date(session.expiresAt).toLocaleDateString('en-PH')}</p>
              </div>
              <button onClick={() => void revoke(session.token)} disabled={busy} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">Revoke</button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}
    </section>
  );
}

export default function SettingsClient() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-violet-100 p-3"><Settings className="text-violet-600" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Platform settings</h1>
            <p className="text-sm text-slate-500">A deliberately narrow set of safe defaults. Secrets, database credentials, and infrastructure controls are managed at the deployment level, not here.</p>
          </div>
        </header>
        <RuntimeSummarySection />
        <PlatformDefaultsSection />
        <SessionSecuritySection />
      </div>
    </main>
  );
}
