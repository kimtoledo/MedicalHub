"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, ImageIcon } from "lucide-react";
import FilesTab from "@/components/app/FilesTab";
import type { EncounterDetail } from "./page";

type Tab = "summary" | "files";

export default function EncounterDetailClient({
  encounter,
  clinicId,
}: {
  encounter: EncounterDetail;
  clinicId: string;
}) {
  const [tab, setTab] = useState<Tab>("summary");

  const statusColor =
    encounter.status === "final"
      ? "bg-green-100 text-green-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/app/encounters"
          className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 mb-2"
        >
          <ArrowLeft size={15} /> All Encounters
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-violet-900">
              {encounter.patientFirstName} {encounter.patientLastName}
            </h1>
            <p className="text-violet-500 text-sm mt-0.5">
              {encounter.patientNumber} · {encounter.date}
              {encounter.branchName && ` · ${encounter.branchName}`}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusColor}`}
          >
            {encounter.status}
          </span>
        </div>
        {encounter.dentistFirstName && (
          <p className="text-violet-400 text-xs mt-1">
            Dr. {encounter.dentistFirstName} {encounter.dentistLastName}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-violet-50 p-1 rounded-xl w-fit">
        {(["summary", "files"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white text-violet-900 shadow-sm"
                : "text-violet-500 hover:text-violet-700"
            }`}
          >
            {t === "summary" ? <ClipboardList size={14} /> : <ImageIcon size={14} />}
            {t === "summary" ? "Summary" : "Files"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "summary" ? (
        <div className="space-y-4">
          {[
            { label: "Chief Complaint", value: encounter.chiefComplaint },
            { label: "Examination", value: encounter.examination },
            { label: "Assessment / Diagnosis", value: encounter.assessment },
            { label: "Procedures Performed", value: encounter.procedures },
            { label: "Recommendations", value: encounter.recommendations },
            { label: "Notes", value: encounter.notes },
          ]
            .filter((f) => f.value)
            .map((f) => (
              <div key={f.label} className="bg-white rounded-2xl shadow-sm border border-violet-100 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2">
                  {f.label}
                </p>
                <p className="text-sm text-violet-800 whitespace-pre-wrap">{f.value}</p>
              </div>
            ))}
          {![encounter.chiefComplaint, encounter.examination, encounter.assessment, encounter.procedures, encounter.recommendations, encounter.notes].some(Boolean) && (
            <div className="bg-white rounded-2xl border border-violet-100 p-8 text-center text-violet-400 text-sm">
              No clinical notes recorded for this encounter.
            </div>
          )}
        </div>
      ) : (
        <FilesTab
          clinicId={clinicId}
          encounterId={encounter.id}
          patientId={encounter.patientId}
          branchId={encounter.branchId}
          allowUpload
        />
      )}
    </div>
  );
}
