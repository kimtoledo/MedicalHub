'use client';

import { useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';

type ClinicMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  joinedAt: string | null;
};

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return 'Not yet joined';
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(value));
}

export default function ClinicMembersTab({ clinicId }: { clinicId: string }) {
  const [items, setItems] = useState<ClinicMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/clinics/${clinicId}/members`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { success: boolean; data?: ClinicMember[]; error?: { message?: string } };
        if (!response.ok || !payload.success) {
          throw new Error(payload.error?.message ?? 'Staff list is unavailable');
        }
        setItems(payload.data ?? []);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : 'Staff list is unavailable');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [clinicId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Loading staff…
      </div>
    );
  }

  if (error) {
    return <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</div>;
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Users size={30} className="text-slate-200" />
        <p className="text-sm font-medium text-slate-500">No active staff members found</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((member) => (
        <div key={member.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{member.name || member.email}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {member.email} · {member.branchName ?? 'All branches'} · Joined {formatDate(member.joinedAt)}
            </p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {formatRole(member.role)}
          </span>
        </div>
      ))}
    </div>
  );
}
