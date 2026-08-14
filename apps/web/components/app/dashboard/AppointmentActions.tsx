"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialogProvider";
const actions: Record<string, Array<{ label: string; status: string }>> = {
  pending: [
    { label: "Confirm", status: "confirmed" },
    { label: "Cancel", status: "cancelled" },
  ],
  confirmed: [
    { label: "Check In", status: "checked_in" },
    { label: "No Show", status: "no_show" },
    { label: "Cancel", status: "cancelled" },
  ],
  checked_in: [
    { label: "Start", status: "in_progress" },
    { label: "Cancel", status: "cancelled" },
  ],
  in_progress: [
    { label: "Complete", status: "completed" },
    { label: "Cancel", status: "cancelled" },
  ],
};
export default function AppointmentActions({
  clinicId,
  appointmentId,
  status,
  onUpdated,
}: {
  clinicId: string;
  appointmentId: string;
  status: string;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  async function update(next: string) {
    const destructive = next === "cancelled" || next === "no_show";
    const confirmed = await confirmDialog({
      title: "Confirm status change",
      message: `Mark this appointment as ${next.replace("_", " ")}?`,
      tone: destructive ? "danger" : "default",
    });
    if (!confirmed) return;
    setSaving(next);
    setError("");
    try {
      const response = await fetch(
        `/api/clinic/appointments/${appointmentId}/status?clinicId=${encodeURIComponent(clinicId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      );
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok)
        throw new Error(result.error?.message ?? "Status could not be updated");
      setSaving("");
      onUpdated?.();
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Status could not be updated",
      );
      setSaving("");
    }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {(actions[status] ?? []).map((item) => (
          <button
            key={item.status}
            disabled={Boolean(saving)}
            onClick={() => void update(item.status)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${item.status === "cancelled" || item.status === "no_show" ? "border border-red-200 text-red-600" : "bg-violet-600 text-white"}`}
          >
            {saving === item.status ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              item.label
            )}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
