'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  UserX,
  Users,
  X,
} from 'lucide-react';

const CLINIC_ROLES = [
  'clinic_owner',
  'clinic_admin',
  'dentist',
  'receptionist',
  'dental_assistant',
  'cashier',
  'inventory_staff',
] as const;

type ClinicRole = (typeof CLINIC_ROLES)[number];

type ClinicMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: ClinicRole;
  dentistId: string | null;
  branchId: string | null;
  isActive: boolean;
  invitedAt: string | null;
  joinedAt: string | null;
  status: 'active' | 'pending' | 'inactive';
};

type ClinicBranch = { id: string; name: string; isMain: boolean };
type DentistOption = { id: string; firstName: string; lastName: string; licenseNumber: string | null; verificationStatus: 'unverified' | 'pending' | 'verified' };

type StaffListResult = { branches: ClinicBranch[]; dentists: DentistOption[]; members: ClinicMember[] };

type ErrorResponse = { error?: { message?: string } };

const field = 'mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm';
const label = 'block text-sm font-semibold text-slate-700';

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const statusStyles: Record<ClinicMember['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  inactive: 'bg-slate-100 text-slate-500',
};

export default function ClinicMembersTab({ clinicId, branches: clinicBranches }: { clinicId: string; branches: ClinicBranch[] }) {
  const router = useRouter();
  const [members, setMembers] = useState<ClinicMember[]>([]);
  const [branches, setBranches] = useState<ClinicBranch[]>(clinicBranches);
  const [dentists, setDentists] = useState<DentistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicMember | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ClinicMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [addRole, setAddRole] = useState<ClinicRole>('receptionist');
  const [editRole, setEditRole] = useState<ClinicRole>('receptionist');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}/staff`, { cache: 'no-store' });
      const payload = (await response.json()) as { success: boolean; data?: StaffListResult; error?: { message?: string } };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? 'Staff list is unavailable');
      }
      setMembers(payload.data.members);
      setDentists(payload.data.dentists);
      if (payload.data.branches.length) setBranches(payload.data.branches);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Staff list is unavailable');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  async function addStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setActionError('');
    const form = new FormData(event.currentTarget);
    const branchId = String(form.get('branchId') || '');
    const payload = {
      name: String(form.get('name') || ''),
      email: String(form.get('email') || ''),
      role: String(form.get('role') || ''),
      branchId: branchId || null,
      dentistId: addRole === 'dentist' ? String(form.get('dentistId') || '') || null : null,
    };
    const response = await fetch(`/api/admin/clinics/${clinicId}/staff`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (!response) {
      setActionError('Unable to reach the server.');
      setIsSubmitting(false);
      return;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ErrorResponse;
      setActionError(body.error?.message ?? 'This staff member could not be added.');
      setIsSubmitting(false);
      return;
    }
    setIsAddOpen(false);
    setIsSubmitting(false);
    router.refresh();
    void load();
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setIsSubmitting(true);
    setActionError('');
    const form = new FormData(event.currentTarget);
    const branchId = String(form.get('branchId') || '');
    const payload = {
      role: String(form.get('role') || ''),
      branchId: branchId || null,
      dentistId: editRole === 'dentist' ? String(form.get('dentistId') || '') || null : null,
    };
    const response = await fetch(`/api/admin/clinics/${clinicId}/staff/${editing.membershipId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (!response) {
      setActionError('Unable to reach the server.');
      setIsSubmitting(false);
      return;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ErrorResponse;
      setActionError(body.error?.message ?? 'This staff member could not be updated.');
      setIsSubmitting(false);
      return;
    }
    setEditing(null);
    setIsSubmitting(false);
    void load();
  }

  async function toggleActive(member: ClinicMember) {
    setIsSubmitting(true);
    setActionError('');
    const response = await fetch(`/api/admin/clinics/${clinicId}/staff/${member.membershipId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isActive: !member.isActive }),
    }).catch(() => null);
    if (!response || !response.ok) {
      const body = response ? ((await response.json().catch(() => ({}))) as ErrorResponse) : undefined;
      setActionError(body?.error?.message ?? 'This staff member could not be updated.');
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    void load();
  }

  async function removeMember() {
    if (!confirmRemove) return;
    setIsSubmitting(true);
    setActionError('');
    const response = await fetch(`/api/admin/clinics/${clinicId}/staff/${confirmRemove.membershipId}`, {
      method: 'DELETE',
    }).catch(() => null);
    if (!response || !response.ok) {
      const body = response ? ((await response.json().catch(() => ({}))) as ErrorResponse) : undefined;
      setActionError(body?.error?.message ?? 'This staff member could not be removed.');
      setIsSubmitting(false);
      return;
    }
    setConfirmRemove(null);
    setIsSubmitting(false);
    void load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{members.length} staff member{members.length === 1 ? '' : 's'}</p>
        <button
          type="button"
          onClick={() => {
            setActionError('');
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
        >
          <Plus size={14} /> Add staff
        </button>
      </div>

      {actionError && (
        <div role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle size={17} className="mt-0.5 shrink-0" /> {actionError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Loading staff…
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Users size={30} className="text-slate-200" />
          <p className="text-sm font-medium text-slate-500">No staff members yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {members.map((member) => {
            const branchName = branches.find((branch) => branch.id === member.branchId)?.name ?? 'All branches';
            return (
              <div key={member.membershipId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{member.name || member.email}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{member.email} · {branchName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{formatRole(member.role)}</span>
                  {member.role === 'dentist' && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.dentistId ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{member.dentistId ? 'Profile linked' : 'Profile missing'}</span>}
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[member.status]}`}>{member.status}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActionError('');
                      setEditRole(member.role);
                      setEditing(member);
                    }}
                    aria-label={`Edit ${member.name || member.email}`}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(member)}
                    disabled={isSubmitting}
                    aria-label={member.isActive ? `Deactivate ${member.name || member.email}` : `Reactivate ${member.name || member.email}`}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-amber-600 disabled:opacity-50"
                  >
                    {member.isActive ? <UserX size={15} /> : <PlayCircle size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionError('');
                      setConfirmRemove(member);
                    }}
                    aria-label={`Remove ${member.name || member.email}`}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">Add staff member</h2>
              <button type="button" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={addStaff} className="mt-5 space-y-4">
              <label className={label}>
                Name
                <input name="name" required minLength={2} maxLength={200} className={field} />
              </label>
              <label className={label}>
                Email
                <input name="email" type="email" required maxLength={255} className={field} />
              </label>
              <label className={label}>
                Role
                <select name="role" value={addRole} onChange={(event) => setAddRole(event.target.value as ClinicRole)} className={field}>
                  {CLINIC_ROLES.map((role) => (
                    <option key={role} value={role}>{formatRole(role)}</option>
                  ))}
                </select>
              </label>
              {addRole === 'dentist' && <label className={label}>
                PRC dentist profile
                <select name="dentistId" required className={field} defaultValue="">
                  <option value="" disabled>Select affiliated dentist</option>
                  {dentists.filter((dentist) => dentist.licenseNumber).map((dentist) => <option key={dentist.id} value={dentist.id}>Dr. {dentist.firstName} {dentist.lastName} · PRC {dentist.licenseNumber} · {dentist.verificationStatus}</option>)}
                </select>
                {!dentists.some((dentist) => dentist.licenseNumber) && <span className="mt-1.5 block text-xs font-normal text-amber-700">Create or update a dentist profile with a PRC number, then affiliate it to this clinic first.</span>}
              </label>}
              <label className={label}>
                Branch
                <select name="branchId" defaultValue="" className={field}>
                  <option value="">All branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </label>
              {actionError && (
                <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" /> {actionError}
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                  {isSubmitting ? 'Adding…' : 'Add staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">Edit {editing.name || editing.email}</h2>
              <button type="button" onClick={() => setEditing(null)} disabled={isSubmitting} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="mt-5 space-y-4">
              <label className={label}>
                Role
                <select name="role" value={editRole} onChange={(event) => setEditRole(event.target.value as ClinicRole)} className={field}>
                  {CLINIC_ROLES.map((role) => (
                    <option key={role} value={role}>{formatRole(role)}</option>
                  ))}
                </select>
              </label>
              {editRole === 'dentist' && <label className={label}>
                PRC dentist profile
                <select name="dentistId" required className={field} defaultValue={editing.dentistId ?? ''}>
                  <option value="" disabled>Select affiliated dentist</option>
                  {dentists.filter((dentist) => dentist.licenseNumber).map((dentist) => <option key={dentist.id} value={dentist.id}>Dr. {dentist.firstName} {dentist.lastName} · PRC {dentist.licenseNumber} · {dentist.verificationStatus}</option>)}
                </select>
              </label>}
              <label className={label}>
                Branch
                <select name="branchId" defaultValue={editing.branchId ?? ''} className={field}>
                  <option value="">All branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </label>
              {actionError && (
                <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" /> {actionError}
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setEditing(null)} disabled={isSubmitting} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Remove {confirmRemove.name || confirmRemove.email}?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This permanently removes their access to this clinic. This action will be recorded in the audit log.
                </p>
              </div>
              <button type="button" onClick={() => setConfirmRemove(null)} disabled={isSubmitting} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {actionError && (
              <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle size={17} className="mt-0.5 shrink-0" /> {actionError}
              </div>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmRemove(null)} disabled={isSubmitting} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void removeMember()}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Removing…' : 'Confirm remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
