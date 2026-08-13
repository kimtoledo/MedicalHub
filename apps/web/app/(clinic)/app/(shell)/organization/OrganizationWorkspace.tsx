'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Loader2, Network, CircleDollarSign, Users, CalendarDays, ClipboardList, ToggleRight, Trash2 } from 'lucide-react';

const FEATURE_KEYS = [
  'appointments.manage', 'appointments.calendar', 'booking.public',
  'patients.manage', 'clinical.records', 'clinical.odontogram', 'clinical.encounters', 'clinical.treatment_records', 'clinical.treatment_plans',
  'staff.manage', 'roles.manage',
  'billing.invoices', 'billing.payments', 'billing.service_catalog', 'clinical.prescriptions',
  'inventory.manage', 'clinical.radiographs',
  'ai.notes', 'ai.recall', 'ai.treatment_sequence', 'ai.imaging',
  'teledentistry', 'hmo.claims',
  'reports.basic', 'reports.advanced',
  'microsite.publish', 'microsite.customize',
  'branches.multi', 'kiosk.checkin',
];

type OrganizationRow = { id: string; name: string; slug: string; role: Role };
type Role = 'owner' | 'admin' | 'regional_manager' | 'viewer';
type ClinicOption = { id: string; name: string; slug: string };
type Workspace = { organization: { id: string; name: string; slug: string; description: string | null }; access: { role: Role; branchIds: string[] }; clinics: Array<{ clinicId: string; clinicName: string; branchId: string | null; branchName: string | null; branchActive: boolean | null }>; members: Array<{ id: string; userId: string; name: string; email: string; role: Role; branchIds: string[] }> };
type Report = { clinicCount: number; branchCount: number; appointments: number; patients: number; revenuePhp: string; scope: string };
type CatalogItem = { id: string; name: string; category: string; description: string | null; durationMinutes: string | number; basePricePhp: string | null; isActive: string | boolean };
type EntitlementGrant = { id: string; featureKey: string; isEnabled: boolean; expiresAt: string | null };
type ApiResponse<T> = { success: boolean; data?: T; error?: { message?: string } };

async function read<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json() as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === undefined) throw new Error(body.error?.message ?? fallback);
  return body.data;
}

export default function OrganizationWorkspace({ currentClinicId, canCreate }: { currentClinicId: string; canCreate: boolean }) {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [eligibleClinics, setEligibleClinics] = useState<ClinicOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogName, setCatalogName] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');
  const [catalogDuration, setCatalogDuration] = useState(30);
  const [catalogPrice, setCatalogPrice] = useState('');
  const [adoptItemId, setAdoptItemId] = useState('');
  const [adoptClinicId, setAdoptClinicId] = useState('');
  const [entitlementGrants, setEntitlementGrants] = useState<EntitlementGrant[]>([]);
  const [grantFeatureKey, setGrantFeatureKey] = useState('');
  const [grantEnabled, setGrantEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [attachClinicId, setAttachClinicId] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<Role>('viewer');
  const [branchIds, setBranchIds] = useState<string[]>([]);

  const loadIndex = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [organizationRows, clinicRows] = await Promise.all([
        read<OrganizationRow[]>(await fetch('/api/organizations', { cache: 'no-store' }), 'Unable to load organizations'),
        read<ClinicOption[]>(await fetch('/api/organizations/eligible-clinics', { cache: 'no-store' }), 'Unable to load eligible clinics'),
      ]);
      setOrganizations(organizationRows); setEligibleClinics(clinicRows);
      setSelectedId((current) => current || organizationRows[0]?.id || '');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load organizations'); }
    finally { setLoading(false); }
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!selectedId) { setWorkspace(null); setReport(null); setCatalog([]); setEntitlementGrants([]); return; }
    setLoading(true); setError(null);
    try {
      const [details, summary, catalogRows, entitlementRows] = await Promise.all([
        read<Workspace>(await fetch(`/api/organizations/${selectedId}/workspace`, { cache: 'no-store' }), 'Unable to load organization workspace'),
        read<Report>(await fetch(`/api/organizations/${selectedId}/report`, { cache: 'no-store' }), 'Unable to load organization summary'),
        read<CatalogItem[]>(await fetch(`/api/organizations/${selectedId}/service-catalog`, { cache: 'no-store' }), 'Unable to load service catalog'),
        read<EntitlementGrant[]>(await fetch(`/api/organizations/${selectedId}/entitlements`, { cache: 'no-store' }), 'Unable to load organization entitlements'),
      ]);
      setWorkspace(details); setReport(summary); setCatalog(catalogRows); setEntitlementGrants(entitlementRows);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load organization workspace'); }
    finally { setLoading(false); }
  }, [selectedId]);

  useEffect(() => { void loadIndex(); }, [loadIndex]);
  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const groupedClinics = useMemo(() => {
    const grouped = new Map<string, { name: string; branches: Workspace['clinics'] }>();
    for (const row of workspace?.clinics ?? []) { const existing = grouped.get(row.clinicId) ?? { name: row.clinicName, branches: [] }; existing.branches.push(row); grouped.set(row.clinicId, existing); }
    return Array.from(grouped.entries());
  }, [workspace]);
  const manageable = workspace && ['owner', 'admin'].includes(workspace.access.role);
  const availableToAttach = eligibleClinics.filter((clinic) => !workspace?.clinics.some((row) => row.clinicId === clinic.id));

  async function createOrganization(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setMessage(null);
    try {
      const created = await read<{ id: string }>(await fetch('/api/organizations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: createName, slug: createSlug, clinicId: currentClinicId }) }), 'Unable to create organization');
      setCreateName(''); setCreateSlug(''); setMessage('Dental group created.'); await loadIndex(); setSelectedId(created.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create organization'); } finally { setSaving(false); }
  }
  async function attachClinic(event: FormEvent) {
    event.preventDefault(); if (!selectedId || !attachClinicId) return; setSaving(true); setError(null);
    try { await read(await fetch(`/api/organizations/${selectedId}/clinics`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clinicId: attachClinicId }) }), 'Unable to attach clinic'); setAttachClinicId(''); setMessage('Clinic attached to the organization.'); await loadWorkspace(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to attach clinic'); } finally { setSaving(false); }
  }
  async function saveMember(event: FormEvent) {
    event.preventDefault(); if (!selectedId) return; setSaving(true); setError(null);
    try { await read(await fetch(`/api/organizations/${selectedId}/members`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: memberEmail, role: memberRole, branchIds: memberRole === 'regional_manager' ? branchIds : [] }) }), 'Unable to save organization member'); setMemberEmail(''); setMemberRole('viewer'); setBranchIds([]); setMessage('Organization member access saved.'); await loadWorkspace(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save organization member'); } finally { setSaving(false); }
  }
  async function createCatalogItem(event: FormEvent) {
    event.preventDefault(); if (!selectedId) return; setSaving(true); setError(null); setMessage(null);
    try {
      await read(await fetch(`/api/organizations/${selectedId}/service-catalog`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: catalogName, category: catalogCategory, durationMinutes: catalogDuration, basePricePhp: catalogPrice || null }) }), 'Unable to create catalog item');
      setCatalogName(''); setCatalogCategory(''); setCatalogDuration(30); setCatalogPrice(''); setMessage('Catalog item added.'); await loadWorkspace();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create catalog item'); } finally { setSaving(false); }
  }
  async function adoptCatalogItem(event: FormEvent) {
    event.preventDefault(); if (!selectedId || !adoptClinicId || !adoptItemId) return; setSaving(true); setError(null); setMessage(null);
    try {
      await read(await fetch(`/api/organizations/${selectedId}/service-catalog/adopt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clinicId: adoptClinicId, itemId: adoptItemId }) }), 'Unable to adopt catalog item');
      setMessage('Catalog item adopted into the clinic price list.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to adopt catalog item'); } finally { setSaving(false); }
  }
  async function grantEntitlement(event: FormEvent) {
    event.preventDefault(); if (!selectedId || !grantFeatureKey) return; setSaving(true); setError(null); setMessage(null);
    try {
      await read(await fetch(`/api/organizations/${selectedId}/entitlements`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ featureKey: grantFeatureKey, isEnabled: grantEnabled }) }), 'Unable to grant entitlement');
      setGrantFeatureKey(''); setMessage('Organization-wide entitlement saved.'); await loadWorkspace();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to grant entitlement'); } finally { setSaving(false); }
  }
  async function revokeEntitlement(featureKey: string) {
    if (!selectedId) return; setSaving(true); setError(null); setMessage(null);
    try {
      await read(await fetch(`/api/organizations/${selectedId}/entitlements/${encodeURIComponent(featureKey)}`, { method: 'DELETE' }), 'Unable to revoke entitlement');
      setMessage('Organization-wide entitlement removed.'); await loadWorkspace();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to revoke entitlement'); } finally { setSaving(false); }
  }

  if (loading && !organizations.length && !workspace) return <main className="p-4 sm:p-6 lg:p-8"><div className="flex items-center gap-2 rounded-2xl bg-white p-8 text-violet-600"><Loader2 className="animate-spin" /> Loading organization workspace…</div></main>;
  return <main className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-2xl bg-violet-100 p-3"><Network className="text-violet-600" /></div><div><h1 className="text-2xl font-bold text-slate-900">Enterprise organization</h1><p className="text-sm text-slate-500">Consolidated visibility remains limited to your assigned organization and branches.</p></div></div>{organizations.length > 0 && <label className="text-sm font-semibold text-slate-700">Dental group<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="ml-2 h-11 rounded-xl border border-violet-200 bg-white px-3">{Array.from(new Map(organizations.map((item) => [item.id, item])).values()).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}</header>
    {error && <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={17} />{error}</div>}{message && <div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
    {!organizations.length && !loading && <section className="rounded-2xl border border-dashed border-violet-200 bg-white p-8"><h2 className="font-bold text-violet-950">No dental group membership yet</h2><p className="mt-1 text-sm text-slate-500">A clinic owner or administrator can create a group from the current clinic.</p>{canCreate && <form onSubmit={createOrganization} className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Group name<input required minLength={2} maxLength={200} value={createName} onChange={(event) => { setCreateName(event.target.value); setCreateSlug(event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label><label className="text-sm font-semibold">URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={createSlug} onChange={(event) => setCreateSlug(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label><button disabled={saving} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Creating…' : 'Create dental group'}</button></form>}</section>}
    {workspace && report && <>
      <section><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-bold text-violet-950">{workspace.organization.name}</h2><p className="text-sm capitalize text-slate-500">{workspace.access.role.replace('_', ' ')} · {report.scope.replace('_', ' ')}</p></div>{loading && <Loader2 className="animate-spin text-violet-500" size={18} />}</div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[Building2, 'Clinics', report.clinicCount], [Network, 'Branches', report.branchCount], [CalendarDays, 'Appointments', report.appointments], [Users, 'Patients', report.patients]].map(([Icon, label, value]) => { const StatIcon = Icon as typeof Building2; return <div key={String(label)} className="rounded-2xl border border-violet-100 bg-white p-5"><StatIcon size={18} className="text-violet-600" /><p className="mt-3 text-2xl font-bold text-slate-900">{String(value)}</p><p className="text-xs text-slate-500">{String(label)}</p></div>; })}</div><div className="mt-3 rounded-2xl border border-violet-100 bg-white p-5"><CircleDollarSign className="text-violet-600" size={18} /><p className="mt-2 text-2xl font-bold text-slate-900">₱{Number(report.revenuePhp).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p><p className="text-xs text-slate-500">Invoiced revenue in visible scope</p></div></section>
      <section className="rounded-2xl border border-violet-100 bg-white"><div className="border-b border-violet-100 p-5"><h2 className="font-bold text-violet-950">Member clinics and branches</h2></div>{groupedClinics.length ? <div className="divide-y divide-violet-50">{groupedClinics.map(([clinicId, clinic]) => <div key={clinicId} className="p-5"><p className="font-semibold text-slate-900">{clinic.name}</p><div className="mt-2 flex flex-wrap gap-2">{clinic.branches.filter((branch) => branch.branchId).map((branch) => <span key={branch.branchId!} className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-700">{branch.branchName}{branch.branchActive ? '' : ' · inactive'}</span>)}</div></div>)}</div> : <p className="p-6 text-sm text-slate-500">No branches are visible in your assigned scope.</p>}</section>
      {manageable && <div className="grid gap-5 lg:grid-cols-2"><form onSubmit={attachClinic} className="rounded-2xl border border-violet-100 bg-white p-5"><h2 className="font-bold text-violet-950">Attach an administered clinic</h2><p className="mt-1 text-xs text-slate-500">You must also be a clinic owner or administrator of the selected clinic.</p><select required value={attachClinicId} onChange={(event) => setAttachClinicId(event.target.value)} className="mt-4 h-11 w-full rounded-xl border border-violet-200 px-3"><option value="">Select clinic</option>{availableToAttach.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}</select><button disabled={saving || !availableToAttach.length} className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Attach clinic</button></form>
      <form onSubmit={saveMember} className="rounded-2xl border border-violet-100 bg-white p-5"><h2 className="font-bold text-violet-950">Add or update organization member</h2><label className="mt-3 block text-sm font-semibold">Dentra account email<input required type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label><label className="mt-3 block text-sm font-semibold">Organization role<select value={memberRole} onChange={(event) => { setMemberRole(event.target.value as Role); setBranchIds([]); }} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3"><option value="viewer">Viewer</option><option value="regional_manager">Regional manager</option><option value="admin">Admin</option>{workspace.access.role === 'owner' && <option value="owner">Owner</option>}</select></label>{memberRole === 'regional_manager' && <fieldset className="mt-3"><legend className="text-sm font-semibold">Assigned branches</legend><div className="mt-2 max-h-36 space-y-2 overflow-y-auto">{workspace.clinics.filter((branch) => branch.branchId).map((branch) => <label key={branch.branchId!} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={branchIds.includes(branch.branchId!)} onChange={(event) => setBranchIds((current) => event.target.checked ? [...current, branch.branchId!] : current.filter((id) => id !== branch.branchId))} />{branch.clinicName} · {branch.branchName}</label>)}</div></fieldset>}<button disabled={saving} className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save member access</button></form></div>}
      {manageable && <section className="rounded-2xl border border-violet-100 bg-white"><div className="border-b border-violet-100 p-5"><h2 className="font-bold text-violet-950">Organization members</h2></div><div className="divide-y divide-violet-50">{workspace.members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 p-4"><div><p className="text-sm font-semibold text-slate-800">{member.name || member.email}</p><p className="text-xs text-slate-500">{member.email}{member.branchIds.length ? ` · ${member.branchIds.length} assigned branch${member.branchIds.length === 1 ? '' : 'es'}` : ''}</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold capitalize text-violet-700">{member.role.replace('_', ' ')}</span></div>)}</div></section>}
      <section className="rounded-2xl border border-violet-100 bg-white"><div className="flex items-center gap-2 border-b border-violet-100 p-5"><ClipboardList className="text-violet-600" size={18} /><h2 className="font-bold text-violet-950">Central service catalog</h2></div><p className="px-5 pt-4 text-xs text-slate-500">Catalog items set a group-wide base price. A clinic adopts an item to add it to its own service list, then may still override the price locally at any time.</p>{catalog.length ? <div className="divide-y divide-violet-50">{catalog.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-4"><div><p className="text-sm font-semibold text-slate-800">{item.name}</p><p className="text-xs text-slate-500">{item.category} · {item.durationMinutes} min{item.basePricePhp ? ` · ₱${Number(item.basePricePhp).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}</p></div>{String(item.isActive) !== 'true' && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">Inactive</span>}</div>)}</div> : <p className="p-5 pt-3 text-sm text-slate-500">No catalog items yet.</p>}
      {manageable && <form onSubmit={createCatalogItem} className="grid gap-3 border-t border-violet-100 p-5 sm:grid-cols-2"><label className="text-sm font-semibold">Item name<input required minLength={2} maxLength={200} value={catalogName} onChange={(event) => setCatalogName(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label><label className="text-sm font-semibold">Category<input required maxLength={100} value={catalogCategory} onChange={(event) => setCatalogCategory(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label><label className="text-sm font-semibold">Duration (minutes)<input required type="number" min={5} max={480} value={catalogDuration} onChange={(event) => setCatalogDuration(Number(event.target.value))} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label><label className="text-sm font-semibold">Base price (₱, optional)<input inputMode="decimal" value={catalogPrice} onChange={(event) => setCatalogPrice(event.target.value)} placeholder="e.g. 2500.00" className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3" /></label><button disabled={saving} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Adding…' : 'Add catalog item'}</button></form>}</section>
      {manageable && catalog.length > 0 && <form onSubmit={adoptCatalogItem} className="rounded-2xl border border-violet-100 bg-white p-5"><h2 className="font-bold text-violet-950">Adopt a catalog item into a clinic</h2><p className="mt-1 text-xs text-slate-500">The clinic must belong to this organization.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><select required value={adoptClinicId} onChange={(event) => setAdoptClinicId(event.target.value)} className="h-11 w-full rounded-xl border border-violet-200 px-3"><option value="">Select clinic</option>{groupedClinics.map(([clinicId, clinic]) => <option key={clinicId} value={clinicId}>{clinic.name}</option>)}</select><select required value={adoptItemId} onChange={(event) => setAdoptItemId(event.target.value)} className="h-11 w-full rounded-xl border border-violet-200 px-3"><option value="">Select catalog item</option>{catalog.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><button disabled={saving} className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Adopt into clinic</button></form>}
      {manageable && <section className="rounded-2xl border border-violet-100 bg-white"><div className="flex items-center gap-2 border-b border-violet-100 p-5"><ToggleRight className="text-violet-600" size={18} /><h2 className="font-bold text-violet-950">Organization-wide feature entitlements</h2></div><p className="px-5 pt-4 text-xs text-slate-500">A group-wide grant fills the gap only when a clinic's own subscription package doesn't already cover a feature — it never overrides a clinic's own explicit setting or its subscribed package.</p>{entitlementGrants.length ? <div className="divide-y divide-violet-50">{entitlementGrants.map((grant) => <div key={grant.id} className="flex flex-wrap items-center justify-between gap-2 p-4"><div><p className="font-mono text-sm font-semibold text-slate-800">{grant.featureKey}</p>{grant.expiresAt && <p className="text-xs text-slate-500">Expires {new Date(grant.expiresAt).toLocaleDateString('en-PH')}</p>}</div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${grant.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{grant.isEnabled ? 'Enabled' : 'Disabled'}</span><button onClick={() => void revokeEntitlement(grant.featureKey)} disabled={saving} className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={14} /></button></div></div>)}</div> : <p className="p-5 pt-3 text-sm text-slate-500">No organization-wide entitlement grants yet.</p>}<form onSubmit={grantEntitlement} className="grid gap-3 border-t border-violet-100 p-5 sm:grid-cols-2"><label className="text-sm font-semibold">Feature key<select required value={grantFeatureKey} onChange={(event) => setGrantFeatureKey(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3"><option value="">Select feature</option>{FEATURE_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}</select></label><label className="text-sm font-semibold">Grant<select value={grantEnabled ? 'true' : 'false'} onChange={(event) => setGrantEnabled(event.target.value === 'true')} className="mt-1 h-11 w-full rounded-xl border border-violet-200 px-3"><option value="true">Enable for the group</option><option value="false">Disable for the group</option></select></label><button disabled={saving} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Saving…' : 'Save entitlement'}</button></form></section>}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-900">Enterprise roadmap handoff</h2><p className="mt-1 text-sm text-amber-800">Cross-clinic staff assignments and consented patient transfers remain tracked in MVP 3 Task 05 and are not implied by this workspace.</p></section>
    </>}
  </div></main>;
}
