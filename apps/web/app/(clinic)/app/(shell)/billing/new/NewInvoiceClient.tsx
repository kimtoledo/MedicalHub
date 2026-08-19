"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Receipt, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { UnbilledEncounter } from "./page";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function NewInvoiceClient({
  encounters,
  clinicId,
  branchId,
  initialEncounterId,
}: {
  encounters: UnbilledEncounter[];
  clinicId: string;
  branchId: string;
  initialEncounterId?: string;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const orderedEncounters = initialEncounterId
    ? [...encounters].sort((a, b) => Number(b.id === initialEncounterId) - Number(a.id === initialEncounterId))
    : encounters;

  async function generate(enc: UnbilledEncounter) {
    setGenerating(enc.id);
    setError(null);
    try {
      const res = await fetch(`/api/clinic/${clinicId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ encounterId: enc.id }),
      });
      const body = await res.json() as { success: boolean; data?: { invoiceId: string }; error?: { message: string } };
      if (!res.ok || !body.success) throw new Error(body.error?.message ?? "Failed to generate invoice");
      router.push(`/app/billing/${body.data!.invoiceId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate invoice");
      setGenerating(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/billing" className="flex items-center gap-2 text-sm text-violet-500 hover:text-violet-700">
          <ArrowLeft size={15} /> Back
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-violet-900">Generate Invoice</h1>
        <p className="text-violet-500 text-sm mt-0.5">
          Select a finalized encounter to create an invoice from its treatment records.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        {encounters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText size={40} className="text-violet-200" />
            <p className="text-violet-400 text-sm font-medium">No unbilled encounters</p>
            <p className="text-violet-300 text-xs text-center max-w-xs">
              All finalized encounters already have invoices, or there are no finalized encounters yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-violet-50">
            {orderedEncounters.map((enc) => {
              const isGenerating = generating === enc.id;
              const isSelected = enc.id === initialEncounterId;
              return (
                <li key={enc.id} className={`px-5 py-4 flex items-center gap-4 ${isSelected ? "bg-violet-50" : ""}`}>
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-violet-900 text-sm">
                      {enc.patientFirstName} {enc.patientLastName}
                      {isSelected ? (
                        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600">
                          Selected encounter
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-violet-400 mt-0.5 font-mono">{enc.patientNumber}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-violet-500">{formatDate(enc.date)}</span>
                      {enc.chiefComplaint && (
                        <span className="text-xs text-violet-400 truncate max-w-48">· {enc.chiefComplaint}</span>
                      )}
                      <span className="text-xs text-violet-300">
                        {enc.treatmentCount} procedure{enc.treatmentCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => { void generate(enc); }}
                    disabled={!!generating}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Receipt size={14} /> Generate
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
