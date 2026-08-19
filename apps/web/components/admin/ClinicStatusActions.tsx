'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Loader2,
  PauseCircle,
  PlayCircle,
  X,
} from 'lucide-react';
import type { ClinicStatus } from '@/lib/admin-clinics';

type StatusAction = {
  status: Exclude<ClinicStatus, 'trial'>;
  label: string;
  confirmation: string;
  success: string;
  tone: 'primary' | 'danger' | 'neutral';
};

const activateAction: StatusAction = {
  status: 'active',
  label: 'Activate',
  confirmation: 'This clinic will regain active platform access.',
  success: 'Clinic activated successfully.',
  tone: 'primary',
};

const reactivateAction: StatusAction = {
  ...activateAction,
  label: 'Reactivate',
  success: 'Clinic reactivated successfully.',
};

const suspendAction: StatusAction = {
  status: 'suspended',
  label: 'Suspend',
  confirmation: 'This clinic will lose platform access until it is reactivated.',
  success: 'Clinic suspended successfully.',
  tone: 'danger',
};

const archiveAction: StatusAction = {
  status: 'archived',
  label: 'Archive',
  confirmation: 'This clinic will be archived and removed from active operations.',
  success: 'Clinic archived successfully.',
  tone: 'neutral',
};

const actionsByStatus: Record<ClinicStatus, StatusAction[]> = {
  trial: [activateAction, suspendAction, archiveAction],
  active: [suspendAction, archiveAction],
  suspended: [reactivateAction, archiveAction],
  archived: [reactivateAction],
};

const buttonStyles: Record<StatusAction['tone'], string> = {
  primary: 'bg-violet-600 text-white hover:bg-violet-700',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  neutral: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
};

type ErrorResponse = {
  error?: { message?: string };
};

type ClinicStatusActionsProps = {
  clinicId: string;
  clinicName: string;
  status: ClinicStatus;
};

export default function ClinicStatusActions({
  clinicId,
  clinicName,
  status,
}: ClinicStatusActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<StatusAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingAction) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) setPendingAction(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSubmitting, pendingAction]);

  async function updateStatus() {
    if (!pendingAction) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/clinics/${clinicId}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: pendingAction.status }),
    }).catch(() => null);

    if (!response) {
      setError('Unable to reach the server. Check that the API is running.');
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ErrorResponse;
      setError(payload.error?.message ?? 'The clinic status could not be updated.');
      setIsSubmitting(false);
      return;
    }

    setSuccess(pendingAction.success);
    setPendingAction(null);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <>
      <div className="space-y-2 sm:text-right">
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {actionsByStatus[status].map((action) => {
            const Icon = action.status === 'active'
              ? PlayCircle
              : action.status === 'suspended'
                ? PauseCircle
                : Archive;

            return (
              <button
                key={`${status}-${action.label}`}
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setPendingAction(action);
                }}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-300 ${buttonStyles[action.tone]}`}
              >
                <Icon size={17} /> {action.label}
              </button>
            );
          })}
        </div>
        {success && (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 size={16} /> {success}
          </p>
        )}
        {error && (
          <p role="alert" className="inline-flex items-center gap-2 text-sm text-red-700">
            <AlertCircle size={16} /> {error}
          </p>
        )}
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clinic-status-dialog-title"
            aria-describedby="clinic-status-dialog-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="clinic-status-dialog-title" className="text-lg font-bold text-slate-900">
                  {pendingAction.label} {clinicName}?
                </h2>
                <p id="clinic-status-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">
                  {pendingAction.confirmation} This action will be recorded in the audit log.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={isSubmitting}
                aria-label="Close confirmation"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle size={17} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setPendingAction(null)}
                disabled={isSubmitting}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void updateStatus()}
                disabled={isSubmitting}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyles[pendingAction.tone]}`}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Updating…' : `Confirm ${pendingAction.label.toLowerCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
