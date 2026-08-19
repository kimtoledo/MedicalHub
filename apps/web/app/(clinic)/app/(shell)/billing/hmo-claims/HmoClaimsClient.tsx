"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, ChevronRight, Clock, CheckCircle, XCircle, Banknote, Send, Plus } from "lucide-react";
import type { ClaimListItem } from "./page";

const STATUS_TABS = [
  { id: "",          label: "All"       },
  { id: "prepared",  label: "Prepared"  },
  { id: "submitted", label: "Submitted" },
  { id: "approved",  label: "Approved"  },
  { id: "rejected",  label: "Rejected"  },
  { id: "paid",      label: "Paid"      },
];

function statusBadgeClass(status: string) {
  if (status === "prepared")  return "bg-gray-100 text-gray-600";
  if (status === "submitted") return "bg-blue-100 text-blue-700";
  if (status === "approved")  return "bg-green-100 text-green-700";
  if (status === "rejected")  return "bg-red-100 text-red-600";
  if (status === "paid")      return "bg-violet-100 text-violet-700";
  return "bg-gray-100 text-gray-500";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "submitted") return <Send size={11} />;
  if (status === "approved")  return <CheckCircle size={11} />;
  if (status === "rejected")  return <XCircle size={11} />;
  if (status === "paid")      return <Banknote size={11} />;
  return <Clock size={11} />;
}

export default function HmoClaimsClient({
  claims,
  total,
  currentPage,
  currentStatus,
  clinicId: _clinicId,
}: {
  claims: ClaimListItem[];
  total: number;
  currentPage: number;
  currentStatus: string;
  clinicId: string;
}) {
  const router = useRouter();

  function setTab(status: string) {
    const qs = status ? `?status=${status}` : "";
    router.push(`/app/billing/hmo-claims${qs}`);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-violet-900">HMO Claims</h1>
          <p className="text-sm text-violet-500 mt-0.5">Track and manage HMO reimbursement claims</p>
        </div>
        <Link
          href="/app/billing/hmo-claims/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} /> New Claim
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-violet-50 p-1 rounded-xl flex-wrap">
        {STATUS_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              currentStatus === id
                ? "bg-white text-violet-900 shadow-sm"
                : "text-violet-500 hover:text-violet-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Claims list */}
      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        {claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Shield size={32} className="text-violet-200" />
            <p className="text-sm text-violet-400 font-medium">No claims {currentStatus ? `with status "${currentStatus}"` : "yet"}</p>
            <Link href="/app/billing/hmo-claims/new"
              className="text-xs text-violet-500 hover:text-violet-700 underline">
              Create your first claim
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-violet-50">
            {claims.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/billing/hmo-claims/${c.id}`}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-violet-50/60 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield size={15} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-violet-900">{c.claimNumber}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${statusBadgeClass(c.status)}`}>
                        <StatusIcon status={c.status} /> {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-violet-700 mt-0.5">{c.patientName} · {c.payerNameSnapshot}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-violet-400 flex-wrap">
                      <span>Claimed: ₱{parseFloat(c.claimAmountPhp).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      {c.approvedAmountPhp && (
                        <span>Approved: ₱{parseFloat(c.approvedAmountPhp).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      )}
                      {c.loaCode && <span>LOA: {c.loaCode}</span>}
                      <span>{new Date(c.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-violet-300 group-hover:text-violet-500 flex-shrink-0 mt-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between text-xs text-violet-400">
          <span>Page {currentPage} · {total} total</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link href={`/app/billing/hmo-claims?${currentStatus ? `status=${currentStatus}&` : ""}page=${currentPage - 1}`}
                className="px-3 py-2 bg-white border border-violet-200 rounded-lg hover:bg-violet-50">← Prev</Link>
            )}
            {currentPage * 20 < total && (
              <Link href={`/app/billing/hmo-claims?${currentStatus ? `status=${currentStatus}&` : ""}page=${currentPage + 1}`}
                className="px-3 py-2 bg-white border border-violet-200 rounded-lg hover:bg-violet-50">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
