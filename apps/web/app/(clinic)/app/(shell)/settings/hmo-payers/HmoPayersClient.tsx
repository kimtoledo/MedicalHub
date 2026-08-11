"use client";

import { useState } from "react";
import {
  Shield, Plus, Pencil, Check, X, Loader2,
  AlertCircle, ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import type { HmoPayer } from "./page";

type FormState = "idle" | "saving" | "error";

const EMPTY_FORM = {
  name: "",
  accreditationNumber: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  notes: "",
};

export default function HmoPayersClient({
  payers: initial,
  clinicId,
}: {
  payers: HmoPayer[];
  clinicId: string;
}) {
  const [payers, setPayers] = useState<HmoPayer[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formState, setFormState] = useState<FormState>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(p: HmoPayer) {
    setForm({
      name: p.name,
      accreditationNumber: p.accreditationNumber ?? "",
      contactPerson: p.contactPerson ?? "",
      contactPhone: p.contactPhone ?? "",
      contactEmail: p.contactEmail ?? "",
      notes: p.notes ?? "",
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  }

  async function save() {
    if (!form.name.trim()) { setFormError("Payer name is required."); return; }
    setFormState("saving");
    setFormError(null);

    const url = editingId
      ? `/api/clinic/${clinicId}/hmo/payers/${editingId}`
      : `/api/clinic/${clinicId}/hmo/payers`;

    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        accreditationNumber: form.accreditationNumber.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }),
    });

    const body = await res.json() as { success: boolean; data?: HmoPayer; error?: { message: string } };

    setFormState("idle");
    if (!res.ok) {
      setFormError(body.error?.message ?? "Save failed.");
      return;
    }

    setShowForm(false);
    window.location.reload();
  }

  async function toggleActive(p: HmoPayer) {
    await fetch(`/api/clinic/${clinicId}/hmo/payers/${p.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: p.isActive === "true" ? "false" : "true" }),
    });
    window.location.reload();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app/settings"
            className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-violet-900">HMO Payers</h1>
            <p className="text-sm text-violet-500">HMO providers your clinic is accredited with</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} /> Add Payer
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white border border-violet-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-violet-900 text-sm">
            {editingId ? "Edit HMO Payer" : "Add HMO Payer"}
          </h2>

          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-violet-700 mb-1">Payer Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Maxicare, Intellicare"
                className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-700 mb-1">Accreditation No.</label>
              <input
                value={form.accreditationNumber}
                onChange={(e) => setForm((f) => ({ ...f, accreditationNumber: e.target.value }))}
                placeholder="e.g. MAX-DEN-2024-001"
                className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-700 mb-1">Contact Person</label>
              <input
                value={form.contactPerson}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                placeholder="HMO liaison name"
                className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-700 mb-1">Contact Phone</label>
              <input
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="02-XXXX-XXXX"
                className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="claims@hmo.com"
                className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-violet-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Claim submission instructions, special requirements..."
                className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={formState === "saving"}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
            >
              {formState === "saving" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {formState === "saving" ? "Saving…" : "Save"}
            </button>
            <button onClick={cancel} className="px-4 py-2 text-sm text-violet-400 hover:text-violet-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Payers list */}
      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        {payers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <Shield size={32} className="text-violet-200" />
            <p className="text-sm text-violet-400 font-medium">No HMO payers configured</p>
            <p className="text-xs text-violet-300">Add the HMOs your clinic is accredited with.</p>
          </div>
        ) : (
          <ul className="divide-y divide-violet-50">
            {payers.map((p) => (
              <li key={p.id} className="flex items-start gap-4 px-5 py-4">
                <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield size={14} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-violet-900">{p.name}</span>
                    {p.isActive !== "true" && (
                      <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-bold">Inactive</span>
                    )}
                  </div>
                  {p.accreditationNumber && (
                    <p className="text-xs text-violet-500 mt-0.5">Accred: {p.accreditationNumber}</p>
                  )}
                  {(p.contactPerson || p.contactPhone) && (
                    <p className="text-xs text-violet-400">
                      {p.contactPerson}{p.contactPerson && p.contactPhone ? " · " : ""}{p.contactPhone}
                    </p>
                  )}
                  {p.notes && <p className="text-xs text-violet-400 italic mt-0.5 line-clamp-1">{p.notes}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => toggleActive(p)}
                    title={p.isActive === "true" ? "Deactivate" : "Activate"}
                    className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-colors"
                  >
                    {p.isActive === "true" ? <X size={13} /> : <Check size={13} />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
