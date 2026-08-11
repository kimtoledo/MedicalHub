"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, ImageIcon, Shield, Plus, Trash2, Loader2 } from "lucide-react";
import FilesTab from "@/components/app/FilesTab";
import type { PatientDetail } from "./page";

type Tab = "profile" | "files" | "hmo";

type HmoMembership = {
  id: string;
  payerNameSnapshot: string;
  cardNumber: string;
  memberName: string | null;
  coverageType: string;
  effectiveDate: string | null;
  expiryDate: string | null;
  isActive: string;
  notes: string | null;
};

const COVERAGE_TYPES = [
  { value: "dental",   label: "Dental" },
  { value: "medical",  label: "Medical" },
  { value: "combined", label: "Combined" },
];

function HmoTab({
  clinicId,
  patientId,
}: {
  clinicId: string;
  patientId: string;
}) {
  const [memberships, setMemberships] = useState<HmoMembership[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ payerNameSnapshot: "", cardNumber: "", memberName: "", coverageType: "dental", effectiveDate: "", expiryDate: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (memberships !== null) return;
    setLoading(true);
    const res = await fetch(`/api/clinic/${clinicId}/patients/${patientId}/hmo`, { credentials: "include" });
    if (res.ok) {
      const body = await res.json() as { success: boolean; data: HmoMembership[] };
      setMemberships(body.data ?? []);
    }
    setLoading(false);
  }

  // Load on first render of tab
  if (memberships === null && !loading) load();

  async function save() {
    if (!form.payerNameSnapshot.trim() || !form.cardNumber.trim()) {
      setError("Payer name and card number are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const body: Record<string, string> = {
      payerNameSnapshot: form.payerNameSnapshot.trim(),
      cardNumber: form.cardNumber.trim(),
      coverageType: form.coverageType,
    };
    if (form.memberName.trim()) body.memberName = form.memberName.trim();
    if (form.effectiveDate) body.effectiveDate = form.effectiveDate;
    if (form.expiryDate) body.expiryDate = form.expiryDate;
    if (form.notes.trim()) body.notes = form.notes.trim();

    const res = await fetch(`/api/clinic/${clinicId}/patients/${patientId}/hmo`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json() as { success: boolean; data?: HmoMembership; error?: { message: string } };
    setSaving(false);
    if (!res.ok || !json.success) { setError(json.error?.message ?? "Save failed."); return; }
    setMemberships((m) => [json.data!, ...(m ?? [])]);
    setShowForm(false);
    setForm({ payerNameSnapshot: "", cardNumber: "", memberName: "", coverageType: "dental", effectiveDate: "", expiryDate: "", notes: "" });
  }

  async function remove(id: string) {
    if (!confirm("Remove this HMO membership?")) return;
    await fetch(`/api/clinic/${clinicId}/patients/${patientId}/hmo/${id}`, {
      method: "DELETE", credentials: "include",
    });
    setMemberships((m) => (m ?? []).filter((x) => x.id !== id));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={24} className="animate-spin text-violet-300" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-violet-500">HMO card records for this patient</p>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors">
          <Plus size={12} /> Add HMO Card
        </button>
      </div>

      {showForm && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-violet-700 mb-1 uppercase">HMO Provider *</label>
              <input value={form.payerNameSnapshot} onChange={(e) => setForm((f) => ({ ...f, payerNameSnapshot: e.target.value }))}
                placeholder="e.g. Maxicare" className="w-full px-3 py-1.5 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-violet-700 mb-1 uppercase">Card Number *</label>
              <input value={form.cardNumber} onChange={(e) => setForm((f) => ({ ...f, cardNumber: e.target.value }))}
                placeholder="HMO card number" className="w-full px-3 py-1.5 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-violet-700 mb-1 uppercase">Member Name</label>
              <input value={form.memberName} onChange={(e) => setForm((f) => ({ ...f, memberName: e.target.value }))}
                placeholder="Name on card" className="w-full px-3 py-1.5 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-violet-700 mb-1 uppercase">Coverage Type</label>
              <select value={form.coverageType} onChange={(e) => setForm((f) => ({ ...f, coverageType: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-xl border border-violet-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                {COVERAGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-violet-700 mb-1 uppercase">Effective Date</label>
              <input type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-violet-700 mb-1 uppercase">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors">
              {saving ? <Loader2 size={11} className="animate-spin" /> : null}
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setShowForm(false); setError(null); }}
              className="px-3 py-1.5 text-xs text-violet-400 hover:text-violet-600">Cancel</button>
          </div>
        </div>
      )}

      {(memberships ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-2">
          <Shield size={28} className="text-violet-200" />
          <p className="text-sm text-violet-400">No HMO cards on file</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(memberships ?? []).map((m) => (
            <div key={m.id} className="bg-white border border-violet-100 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Shield size={14} className="text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-violet-900">{m.payerNameSnapshot}</span>
                  <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded capitalize">{m.coverageType}</span>
                </div>
                <p className="text-xs text-violet-600 font-mono mt-0.5">{m.cardNumber}</p>
                {m.memberName && <p className="text-xs text-violet-500">{m.memberName}</p>}
                <div className="flex gap-3 text-[10px] text-violet-400 mt-0.5">
                  {m.effectiveDate && <span>From: {m.effectiveDate}</span>}
                  {m.expiryDate && <span>Until: {m.expiryDate}</span>}
                </div>
              </div>
              <button onClick={() => remove(m.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-violet-300 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientDetailClient({
  patient,
  clinicId,
  branchId,
}: {
  patient: PatientDetail;
  clinicId: string;
  branchId: string;
}) {
  const [tab, setTab] = useState<Tab>("profile");

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: "profile", label: "Profile",  Icon: User      },
    { id: "hmo",     label: "HMO",      Icon: Shield    },
    { id: "files",   label: "Files",    Icon: ImageIcon },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-5">
      {/* Header */}
      <div>
        <Link href="/app/patients"
          className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 mb-2">
          <ArrowLeft size={15} /> All Patients
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <User size={22} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-violet-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-violet-500 text-sm mt-0.5">
              {patient.patientNumber}
              {patient.dateOfBirth ? ` · Born ${patient.dateOfBirth}` : ""}
              {patient.sex ? ` · ${patient.sex}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-violet-50 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id
                ? "bg-white text-violet-900 shadow-sm"
                : "text-violet-500 hover:text-violet-700"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "profile" && (
        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: "Phone",   value: patient.phone },
              { label: "Email",   value: patient.email },
              { label: "Address", value: [patient.address, patient.city].filter(Boolean).join(", ") || null },
            ]
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">{f.label}</p>
                  <p className="text-sm text-violet-800 mt-0.5">{f.value}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === "hmo" && (
        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-6">
          <HmoTab clinicId={clinicId} patientId={patient.id} />
        </div>
      )}

      {tab === "files" && (
        <FilesTab
          clinicId={clinicId}
          patientId={patient.id}
          branchId={branchId}
          allowUpload={!!branchId}
        />
      )}
    </div>
  );
}
