"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Shield, CheckCircle, XCircle, Send, Banknote,
  Clock, Loader2, AlertCircle, Printer, ChevronDown,
} from "lucide-react";
import type { ClaimDetail, ClaimPdfData } from "./page";

const STATUS_FLOW = [
  { key: "prepared",  label: "Prepared" },
  { key: "submitted", label: "Submitted" },
  { key: "approved",  label: "Approved" },
  { key: "paid",      label: "Paid" },
];

function statusBadgeClass(s: string) {
  return s === "prepared"  ? "bg-gray-100 text-gray-600"
    : s === "submitted"    ? "bg-blue-100 text-blue-700"
    : s === "approved"     ? "bg-green-100 text-green-700"
    : s === "rejected"     ? "bg-red-100 text-red-600"
    : s === "paid"         ? "bg-violet-100 text-violet-700"
    : "bg-gray-100 text-gray-500";
}

function fmt(n: string | null | undefined): string {
  if (!n) return "—";
  return `₱${parseFloat(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

type UpdateState = "idle" | "submitting" | "error";

const NEXT_ACTIONS: Record<string, { label: string; nextStatus: string; needsInput?: string }[]> = {
  prepared:  [{ label: "Mark as Submitted", nextStatus: "submitted" }],
  submitted: [
    { label: "Mark as Approved", nextStatus: "approved", needsInput: "approvedAmount" },
    { label: "Mark as Rejected", nextStatus: "rejected", needsInput: "rejectionReason" },
  ],
  approved:  [{ label: "Mark as Paid (auto-records invoice payment)", nextStatus: "paid" }],
  rejected:  [],
  paid:      [],
};

export default function ClaimDetailClient({
  claim,
  pdfData,
  clinicId,
  isAdmin: _isAdmin,
}: {
  claim: ClaimDetail;
  pdfData: ClaimPdfData | null;
  clinicId: string;
  isAdmin: boolean;
}) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [approvedAmount, setApprovedAmount] = useState(claim.approvedAmountPhp ?? "");
  const [rejectionReason, setRejectionReason] = useState("");
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [updateError, setUpdateError] = useState<string | null>(null);

  const actions = NEXT_ACTIONS[claim.status] ?? [];

  async function doStatusUpdate(nextStatus: string) {
    setUpdateState("submitting");
    setUpdateError(null);

    const body: Record<string, string> = { to: nextStatus };
    if (nextStatus === "approved") body.approvedAmountPhp = parseFloat(approvedAmount || "0").toFixed(2);
    if (nextStatus === "rejected") body.rejectionReason = rejectionReason;

    const res = await fetch(`/api/clinic/${clinicId}/hmo/claims/${claim.id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { success: boolean; error?: { message: string } };
    setUpdateState("idle");

    if (!res.ok || !json.success) {
      setUpdateError(json.error?.message ?? "Update failed.");
      return;
    }

    // Reload to reflect new status
    window.location.reload();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-5">
      {/* Back */}
      <div>
        <Link href="/app/billing/hmo-claims"
          className="inline-flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 mb-2">
          <ArrowLeft size={15} /> HMO Claims
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-violet-900">{claim.claimNumber}</h1>
            <p className="text-sm text-violet-500 mt-0.5">{claim.patientName} · {claim.payerNameSnapshot}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusBadgeClass(claim.status)}`}>
              {claim.status}
            </span>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-500 border border-violet-200 hover:bg-violet-50 rounded-xl transition-colors"
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Progress tracker */}
      {claim.status !== "rejected" && (
        <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-4 print:hidden">
          <div className="flex items-center justify-between">
            {STATUS_FLOW.map((s, i) => {
              const statuses = STATUS_FLOW.map((x) => x.key);
              const currentIdx = statuses.indexOf(claim.status);
              const isCompleted = i < currentIdx || claim.status === "paid";
              const isCurrent = s.key === claim.status;
              return (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted || isCurrent ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-400"
                    }`}>
                      {isCompleted && !isCurrent ? <CheckCircle size={14} /> : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 font-semibold ${isCurrent ? "text-violet-700" : "text-violet-400"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < currentIdx ? "bg-violet-600" : "bg-violet-100"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Claim details */}
      <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-violet-400">Claim Information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Claim Amount",    value: fmt(claim.claimAmountPhp) },
            { label: "Approved Amount", value: fmt(claim.approvedAmountPhp) },
            { label: "LOA / Code",      value: claim.loaCode ?? "—" },
            { label: "Invoice",         value: claim.invoiceId ? claim.invoiceId.slice(0, 8) + "…" : "—" },
            { label: "Encounter",       value: claim.encounterId ? claim.encounterId.slice(0, 8) + "…" : "—" },
            { label: "Prepared",        value: fmtDate(claim.createdAt) },
            { label: "Submitted",       value: fmtDate(claim.submittedAt) },
            { label: "Approved",        value: fmtDate(claim.approvedAt) },
            { label: "Paid",            value: fmtDate(claim.paidAt) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm text-violet-900 font-medium">{value}</p>
            </div>
          ))}
        </div>
        {claim.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-red-600 mb-0.5">Rejection Reason</p>
            <p className="text-sm text-red-800">{claim.rejectionReason}</p>
          </div>
        )}
        {claim.notes && (
          <p className="text-xs text-violet-500 italic">{claim.notes}</p>
        )}
      </div>

      {/* Membership / encounter / invoice from PDF data */}
      {pdfData && (
        <>
          {pdfData.membership && (
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-5 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-violet-400">HMO Membership</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-violet-400 uppercase">Card No.</p>
                  <p className="text-sm font-mono text-violet-900">{pdfData.membership.cardNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-violet-400 uppercase">Member Name</p>
                  <p className="text-sm text-violet-900">{pdfData.membership.memberName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-violet-400 uppercase">Coverage</p>
                  <p className="text-sm text-violet-900 capitalize">{pdfData.membership.coverageType}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-violet-400 uppercase">Effective</p>
                  <p className="text-sm text-violet-900">{pdfData.membership.effectiveDate ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-violet-400 uppercase">Expiry</p>
                  <p className="text-sm text-violet-900">{pdfData.membership.expiryDate ?? "—"}</p>
                </div>
              </div>
            </div>
          )}

          {pdfData.encounter && (
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-5 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-violet-400">Encounter Summary</h2>
              <p className="text-xs text-violet-500">Date: {pdfData.encounter.date}</p>
              {pdfData.encounter.chiefComplaint && (
                <div>
                  <p className="text-[10px] font-semibold text-violet-400 uppercase">Chief Complaint</p>
                  <p className="text-sm text-violet-900">{pdfData.encounter.chiefComplaint}</p>
                </div>
              )}
              {pdfData.encounter.procedures && (
                <div>
                  <p className="text-[10px] font-semibold text-violet-400 uppercase">Procedures</p>
                  <p className="text-sm text-violet-900 whitespace-pre-wrap">{pdfData.encounter.procedures}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Status action buttons */}
      {actions.length > 0 && (
        <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5 space-y-4 print:hidden">
          <h2 className="text-xs font-bold uppercase tracking-widest text-violet-400">Update Status</h2>

          {updateError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {updateError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {actions.map(({ label, nextStatus, needsInput }) => (
              <div key={nextStatus}>
                <button
                  type="button"
                  onClick={() => setActiveAction(activeAction === nextStatus ? null : nextStatus)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors w-full sm:w-auto ${
                    nextStatus === "paid"     ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : nextStatus === "approved" ? "bg-green-500 hover:bg-green-600 text-white"
                    : nextStatus === "rejected" ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {nextStatus === "submitted" && <Send size={14} />}
                  {nextStatus === "approved"  && <CheckCircle size={14} />}
                  {nextStatus === "rejected"  && <XCircle size={14} />}
                  {nextStatus === "paid"      && <Banknote size={14} />}
                  {label}
                  <ChevronDown size={12} className={`ml-auto transition-transform ${activeAction === nextStatus ? "rotate-180" : ""}`} />
                </button>

                {activeAction === nextStatus && (
                  <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    {needsInput === "approvedAmount" && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Approved Amount (PHP) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={approvedAmount}
                          onChange={(e) => setApprovedAmount(e.target.value)}
                          placeholder="0.00"
                          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 w-48"
                        />
                      </div>
                    )}
                    {needsInput === "rejectionReason" && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Rejection Reason *</label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={2}
                          placeholder="Reason for rejection from HMO…"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                        />
                      </div>
                    )}
                    {nextStatus === "paid" && claim.invoiceId && (
                      <p className="text-xs text-violet-600 bg-violet-50 rounded-lg px-3 py-2">
                        This will automatically record an invoice payment for{" "}
                        <strong>{fmt(claim.approvedAmountPhp ?? claim.claimAmountPhp)}</strong> and mark the invoice as paid.
                      </p>
                    )}
                    <button
                      onClick={() => doStatusUpdate(nextStatus)}
                      disabled={updateState === "submitting"}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
                    >
                      {updateState === "submitting" ? <Loader2 size={13} className="animate-spin" /> : null}
                      {updateState === "submitting" ? "Updating…" : "Confirm"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printable claim document */}
      <div className="hidden print:block bg-white p-8 space-y-6">
        <div className="border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold">HMO Reimbursement Claim</h1>
          <p className="text-sm text-gray-500 mt-1">Claim No: {claim.claimNumber}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="font-bold text-gray-700 mb-2">Patient Information</p>
            <p>{claim.patientName}</p>
            {pdfData?.membership && (
              <>
                <p className="mt-1">HMO Card: {pdfData.membership.cardNumber}</p>
                <p>Member Name: {pdfData.membership.memberName ?? claim.patientName}</p>
                <p>Coverage: {pdfData.membership.coverageType}</p>
                {pdfData.membership.effectiveDate && <p>Effective: {pdfData.membership.effectiveDate}</p>}
                {pdfData.membership.expiryDate && <p>Expiry: {pdfData.membership.expiryDate}</p>}
              </>
            )}
          </div>

          <div>
            <p className="font-bold text-gray-700 mb-2">HMO Provider</p>
            <p>{claim.payerNameSnapshot}</p>
            {claim.loaCode && <p className="mt-1">LOA / Approval Code: {claim.loaCode}</p>}
            {pdfData?.invoice && (
              <p className="mt-1">Invoice: {pdfData.invoice.invoiceNumber}</p>
            )}
          </div>
        </div>

        {pdfData?.encounter && (
          <div className="text-sm border-t pt-4">
            <p className="font-bold text-gray-700 mb-2">Encounter Details — {pdfData.encounter.date}</p>
            {pdfData.encounter.chiefComplaint && (
              <p><span className="font-semibold">Chief Complaint:</span> {pdfData.encounter.chiefComplaint}</p>
            )}
            {pdfData.encounter.procedures && (
              <p className="mt-1"><span className="font-semibold">Procedures:</span> {pdfData.encounter.procedures}</p>
            )}
          </div>
        )}

        <div className="border-t pt-4 text-sm">
          <div className="flex justify-between font-bold text-base">
            <span>Claim Amount</span>
            <span>{fmt(claim.claimAmountPhp)}</span>
          </div>
          {claim.approvedAmountPhp && (
            <div className="flex justify-between font-bold text-green-700 mt-1">
              <span>Approved Amount</span>
              <span>{fmt(claim.approvedAmountPhp)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-16 text-sm pt-8">
          <div>
            <div className="border-t border-gray-800 pt-1">
              <p className="text-gray-500">Attending Dentist Signature &amp; Date</p>
            </div>
          </div>
          <div>
            <div className="border-t border-gray-800 pt-1">
              <p className="text-gray-500">Clinic Authorized Representative</p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 text-center pt-4">
          Generated by Dentra.ph · {new Date().toLocaleDateString("en-PH")}
        </p>
      </div>
    </div>
  );
}
