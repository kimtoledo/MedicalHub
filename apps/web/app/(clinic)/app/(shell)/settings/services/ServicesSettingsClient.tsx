"use client";

import { useEffect, useState } from "react";
import { Check, DollarSign, Pencil, X } from "lucide-react";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: string;
  pricePhp: string | null;
  isActive: string;
};

function formatPhp(amount: string | null) {
  if (!amount) return "—";
  return `₱${parseFloat(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function ServicesSettingsClient({ clinicId, isAdmin }: { clinicId: string; isAdmin: boolean }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clinic/${clinicId}/services`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (data.success) setServices(data.data); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [clinicId]);

  function startEdit(svc: Service) {
    setEditingId(svc.id);
    setEditValue(svc.pricePhp ?? "");
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
    setSaveError(null);
  }

  async function savePrice(svc: Service) {
    setSavingId(svc.id);
    setSaveError(null);

    const pricePhp = editValue.trim() === "" ? null : editValue.trim();

    if (pricePhp !== null && !/^\d+(\.\d{1,2})?$/.test(pricePhp)) {
      setSaveError("Enter a valid amount (e.g. 500 or 750.00)");
      setSavingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/clinic/${clinicId}/services/${svc.id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pricePhp }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(body?.error?.message ?? "Save failed");
      }

      setServices((prev) =>
        prev.map((s) => (s.id === svc.id ? { ...s, pricePhp } : s))
      );
      setEditingId(null);
      setEditValue("");
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-violet-900">Service Pricing</h1>
        <p className="text-violet-500 text-sm mt-2">Only clinic administrators can edit service prices.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-violet-900">Service Pricing</h1>
        <p className="text-violet-500 text-sm mt-0.5">Set prices for each service in your clinic catalog</p>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl">
          {saveError}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <DollarSign size={32} className="text-violet-200" />
            <p className="text-violet-400 text-sm">No services configured yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-violet-50">
            {services.map((svc) => {
              const isEditing = editingId === svc.id;
              const isSaving  = savingId === svc.id;

              return (
                <li key={svc.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-violet-900 text-sm truncate">{svc.name}</p>
                      {svc.isActive !== "true" && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold">Inactive</span>
                      )}
                    </div>
                    {svc.description && (
                      <p className="text-xs text-violet-400 mt-0.5 truncate">{svc.description}</p>
                    )}
                    <p className="text-xs text-violet-300 mt-0.5">{svc.durationMinutes} min</p>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 text-sm">₱</span>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="0.00"
                          autoFocus
                          className="w-28 pl-7 pr-3 py-1.5 rounded-lg border border-violet-300 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void savePrice(svc);
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />
                      </div>
                      <button
                        onClick={() => void savePrice(svc)}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-600 transition-colors disabled:opacity-60"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-sm font-semibold ${svc.pricePhp ? "text-violet-900" : "text-violet-300"}`}>
                        {formatPhp(svc.pricePhp)}
                      </span>
                      <button
                        onClick={() => startEdit(svc)}
                        className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-400 hover:text-violet-600 transition-colors"
                        title="Edit price"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-violet-400">
        Prices are snapshotted at the time of invoice generation — changing a price does not affect existing invoices.
      </p>
    </div>
  );
}
