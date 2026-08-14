"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ChevronDown, MailPlus, MapPin, RefreshCw, ShieldCheck, UserCog, UserMinus } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialogProvider";

type ClinicRole = "clinic_owner" | "clinic_admin" | "dentist" | "receptionist" | "dental_assistant" | "cashier" | "inventory_staff";
type StaffMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: ClinicRole;
  branchId: string | null;
  status: "active" | "pending" | "inactive";
  invitedAt: string | null;
  joinedAt: string | null;
  permissions: string[];
};
type StaffData = {
  branches: Array<{ id: string; name: string; isMain: boolean }>;
  permissionKeys: string[];
  members: StaffMember[];
};

const roles: Array<{ value: ClinicRole; label: string }> = [
  { value: "clinic_owner", label: "Clinic Owner" },
  { value: "clinic_admin", label: "Clinic Admin" },
  { value: "dentist", label: "Dentist" },
  { value: "receptionist", label: "Receptionist" },
  { value: "dental_assistant", label: "Dental Assistant" },
  { value: "cashier", label: "Cashier" },
  { value: "inventory_staff", label: "Inventory Staff" },
];
const permissionLabels: Record<string, string> = {
  "appointments.manage": "Appointments",
  "patients.manage": "Patients",
  "clinical.records": "Clinical records",
  "billing.invoices": "Invoices",
  "billing.payments": "Payments",
  "inventory.manage": "Inventory",
  "reports.basic": "Reports",
  "microsite.customize": "Microsite",
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const payload = await response.json() as { success: boolean; data?: T; error?: { message?: string } };
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message ?? "Request failed");
  return payload.data;
}

function roleLabel(role: ClinicRole) {
  return roles.find((item) => item.value === role)?.label ?? role;
}

export default function StaffManager({ clinicId, currentUserId, currentRole }: { clinicId: string; currentUserId: string; currentRole: string }) {
  const confirmDialog = useConfirm();
  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingBranchFor, setAddingBranchFor] = useState<string | null>(null);
  const [newBranchId, setNewBranchId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await api<StaffData>(`/api/clinic/${clinicId}/staff`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load staff"); }
    finally { setLoading(false); }
  }, [clinicId]);

  useEffect(() => { void load(); }, [load]);

  async function mutate(key: string, url: string, init: RequestInit, success: string): Promise<boolean> {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await api(url, init);
      setNotice(success);
      await load();
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save change"); return false; }
    finally { setBusy(null); }
  }

  async function removeMember(member: StaffMember) {
    const confirmed = await confirmDialog({
      title: "Remove staff member",
      message: `Remove ${member.name} from this clinic?`,
      tone: "danger",
      confirmLabel: "Yes, remove",
    });
    if (!confirmed) return;
    void mutate(member.membershipId, `/api/clinic/${clinicId}/staff/${member.membershipId}`, { method: "DELETE" }, "Membership removed.");
  }

  async function addBranch(userId: string, branchId: string) {
    const saved = await mutate(`add-branch-${userId}`, `/api/clinic/${clinicId}/staff/branch-assignments`, {
      method: "POST",
      body: JSON.stringify({ userId, branchId }),
    }, "Branch assignment added.");
    if (saved) { setAddingBranchFor(null); setNewBranchId(""); }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await mutate("invite", `/api/clinic/${clinicId}/staff/invitations`, {
      method: "POST",
      body: JSON.stringify({ name: form.get("name"), email: form.get("email"), role: form.get("role"), branchId: form.get("branchId") || null }),
    }, "Invitation recorded. Email delivery will begin when the notification provider is configured.");
    if (saved) setInviteOpen(false);
  }

  if (loading && !data) return <div className="p-6" role="status"><div className="h-40 animate-pulse rounded-2xl bg-violet-100" /><span className="sr-only">Loading clinic staff</span></div>;

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100"><UserCog className="text-violet-600" size={22} /></div>
            <div><h1 className="text-2xl font-bold text-slate-900">Clinic Staff</h1><p className="text-sm text-slate-500">Manage roles, branch access, status, and permissions.</p></div>
          </div>
          <button onClick={() => setInviteOpen((value) => !value)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700"><MailPlus size={17} /> Invite staff</button>
        </header>

        {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div>}

        {inviteOpen && data && (
          <form onSubmit={invite} className="grid gap-4 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm sm:grid-cols-2" aria-label="Invite clinic staff">
            <label className="text-sm font-medium text-slate-700">Full name<input name="name" required minLength={2} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Email<input name="email" type="email" required className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Role<select name="role" className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3">{roles.filter((role) => currentRole === "clinic_owner" || role.value !== "clinic_owner").map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">Branch access<select name="branchId" className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3"><option value="">All branches</option>{data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.isMain ? " (Main)" : ""}</option>)}</select></label>
            <div className="flex gap-2 sm:col-span-2"><button disabled={busy === "invite"} className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy === "invite" ? "Sending…" : "Create invitation"}</button><button type="button" onClick={() => setInviteOpen(false)} className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600">Cancel</button></div>
          </form>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 className="font-semibold text-slate-900">Team members</h2><p className="text-xs text-slate-500">{data?.members.length ?? 0} memberships</p></div><button onClick={() => void load()} disabled={loading} aria-label="Refresh staff" className="rounded-lg p-2 text-violet-600 hover:bg-violet-50"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button></div>
          {data && data.members.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No staff memberships yet. Invite the first team member.</div>}
          <div className="divide-y divide-slate-100">
            {data?.members.map((member) => {
              const own = member.userId === currentUserId;
              const branch = data.branches.find((item) => item.id === member.branchId);
              const disabled = busy === member.membershipId || own;
              return (
                <article key={member.membershipId} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{member.name || "Pending user"}{own ? " (You)" : ""}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${member.status === "active" ? "bg-emerald-100 text-emerald-700" : member.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{member.status}</span></div><p className="truncate text-sm text-slate-500">{member.email}</p><p className="mt-1 text-xs text-slate-500">{branch?.name ?? "All branches"} · {roleLabel(member.role)}{data.members.filter((other) => other.userId === member.userId).length > 1 && ` · also assigned to ${data.members.filter((other) => other.userId === member.userId && other.membershipId !== member.membershipId).length} other branch(es)`}</p></div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:w-[34rem] lg:grid-cols-4">
                      <select aria-label={`Role for ${member.name}`} value={member.role} disabled={disabled || (member.role === "clinic_owner" && currentRole !== "clinic_owner")} onChange={(event) => void mutate(member.membershipId, `/api/clinic/${clinicId}/staff/${member.membershipId}`, { method: "PATCH", body: JSON.stringify({ role: event.target.value }) }, "Role updated.")} className="h-10 rounded-xl border border-slate-300 px-2 text-sm disabled:bg-slate-50">{roles.filter((role) => currentRole === "clinic_owner" || role.value !== "clinic_owner").map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
                      <select aria-label={`Branch for ${member.name}`} value={member.branchId ?? ""} disabled={disabled} onChange={(event) => void mutate(member.membershipId, `/api/clinic/${clinicId}/staff/${member.membershipId}`, { method: "PATCH", body: JSON.stringify({ branchId: event.target.value || null }) }, "Branch access updated.")} className="h-10 rounded-xl border border-slate-300 px-2 text-sm disabled:bg-slate-50"><option value="">All branches</option>{data.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                      <button disabled={disabled} onClick={() => void mutate(member.membershipId, `/api/clinic/${clinicId}/staff/${member.membershipId}`, { method: "PATCH", body: JSON.stringify({ isActive: member.status === "inactive" }) }, member.status === "inactive" ? "Membership activated." : "Membership deactivated.")} className="h-10 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 disabled:opacity-40">{member.status === "inactive" ? "Activate" : "Deactivate"}</button>
                      <button disabled={disabled} onClick={() => void removeMember(member)} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-red-200 px-3 text-sm font-medium text-red-600 disabled:opacity-40"><UserMinus size={15} /> Remove</button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {member.status === "pending" && <button disabled={busy === member.membershipId} onClick={() => void mutate(member.membershipId, `/api/clinic/${clinicId}/staff/${member.membershipId}/resend-invite`, { method: "POST" }, "Invitation timestamp refreshed; delivery is pending provider configuration.")} className="text-xs font-semibold text-violet-600 underline">Resend invitation</button>}
                    <button onClick={() => setExpanded(expanded === member.membershipId ? null : member.membershipId)} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600"><ShieldCheck size={14} /> Permissions <ChevronDown size={14} className={expanded === member.membershipId ? "rotate-180" : ""} /></button>
                    {member.branchId !== null && member.status === "active" && (
                      addingBranchFor === member.membershipId ? (
                        <span className="inline-flex items-center gap-1.5">
                          <select aria-label="Additional branch" value={newBranchId} onChange={(event) => setNewBranchId(event.target.value)} className="h-8 rounded-lg border border-slate-300 px-2 text-xs">
                            <option value="">Select branch…</option>
                            {data.branches.filter((branch) => !data.members.some((other) => other.userId === member.userId && other.branchId === branch.id)).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                          </select>
                          <button disabled={!newBranchId || busy === `add-branch-${member.userId}`} onClick={() => void addBranch(member.userId, newBranchId)} className="rounded-lg bg-violet-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">Add</button>
                          <button onClick={() => { setAddingBranchFor(null); setNewBranchId(""); }} className="text-xs text-slate-500">Cancel</button>
                        </span>
                      ) : (
                        <button onClick={() => setAddingBranchFor(member.membershipId)} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600"><MapPin size={14} /> Add branch</button>
                      )
                    )}
                  </div>
                  {expanded === member.membershipId && <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">{data.permissionKeys.map((permission) => <label key={permission} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={member.permissions.includes(permission)} disabled={disabled || member.status !== "active"} onChange={(event) => void mutate(member.membershipId, `/api/clinic/${clinicId}/staff/${member.membershipId}/permissions`, { method: "PATCH", body: JSON.stringify({ permissionKey: permission, isEnabled: event.target.checked }) }, "Permission updated.")} className="h-4 w-4 rounded border-slate-300 text-violet-600" />{permissionLabels[permission] ?? permission}</label>)}</div>}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
