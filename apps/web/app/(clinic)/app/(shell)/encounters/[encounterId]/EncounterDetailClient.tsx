"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, ImageIcon, Sparkles, Receipt } from "lucide-react";
import FilesTab from "@/components/app/FilesTab";
import AINoteSuggest from "@/components/app/ai/AINoteSuggest";
import AIRecallBanner from "@/components/app/ai/AIRecallBanner";
import AITreatmentPanel from "@/components/app/ai/AITreatmentPanel";
import type { EncounterDetail } from "./page";
import PrescriptionDrawer from "../../prescriptions/new/PrescriptionDrawer";

type Tab = "summary" | "files" | "ai";

export default function EncounterDetailClient({
  encounter,
  clinicId,
  isDentist,
  canPrescribe,
  canUseFiles,
  canBill,
}: {
  encounter: EncounterDetail;
  clinicId: string;
  isDentist: boolean;
  canPrescribe: boolean;
  canUseFiles: boolean;
  canBill: boolean;
}) {
  const [tab, setTab] = useState<Tab>("summary");

  // Track accepted AI note sections locally (display-only; actual saving
  // happens when the encounter edit form is built)
  const [acceptedNotes, setAcceptedNotes] = useState<Record<string, string>>({});

  const statusColor =
    encounter.status === "final"
      ? "bg-green-100 text-green-700"
      : "bg-amber-100 text-amber-700";

  const procedures = [
    encounter.procedures,
    encounter.assessment,
  ].filter(Boolean) as string[];

  const tabs = [
    { id: "summary" as Tab, label: "Summary",     Icon: ClipboardList },
    ...(canUseFiles ? [{ id: "files" as Tab, label: "Files", Icon: ImageIcon }] : []),
    ...(isDentist ? [{ id: "ai" as Tab, label: "AI Assistant", Icon: Sparkles }] : []),
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/app/encounters"
          className="flex items-center gap-2 text-sm text-violet-500 hover:text-violet-700 mb-2"
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
        {encounter.status === "final" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {isDentist && canPrescribe ? (
              <PrescriptionDrawer clinicId={clinicId} encounterId={encounter.id} />
            ) : null}
            {canBill ? (
              <Link
                href={`/app/billing/new?encounterId=${encodeURIComponent(encounter.id)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <Receipt size={15} /> Generate Invoice
              </Link>
            ) : null}
          </div>
        ) : null}
        {encounter.dentistFirstName && (
          <p className="text-violet-400 text-xs mt-1">
            Dr. {encounter.dentistFirstName} {encounter.dentistLastName}
          </p>
        )}
      </div>

      {/* AI Recall Banner — review-only suggestion shown to dentists on finalized encounters */}
      {isDentist && encounter.status === "final" && procedures.length > 0 && (
        <AIRecallBanner
          clinicId={clinicId}
          encounterId={encounter.id}
          procedures={procedures}
          encounterDate={encounter.date}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-violet-50 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id
                ? "bg-white text-violet-900 shadow-sm"
                : "text-violet-500 hover:text-violet-700"
            }`}
          >
            <Icon size={14} />
            {label}
            {id === "ai" && (
              <span className="ml-1 text-[9px] font-bold bg-violet-100 text-violet-500 px-1.5 py-0.5 rounded-full">MVP 2</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Summary */}
      {tab === "summary" && (
        <div className="space-y-4">
          {/* Show accepted AI notes as a preview banner */}
          {Object.keys(acceptedNotes).length > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} className="text-violet-500" />
                <p className="text-xs font-semibold text-violet-700">
                  AI suggestions accepted — save them when you edit this encounter
                </p>
              </div>
              {Object.entries(acceptedNotes).map(([section, text]) => (
                <div key={section} className="text-xs text-violet-600 mb-1">
                  <span className="font-semibold capitalize">{section}:</span> {text.slice(0, 80)}{text.length > 80 ? "…" : ""}
                </div>
              ))}
            </div>
          )}

          {[
            { label: "Chief Complaint",     value: encounter.chiefComplaint },
            { label: "Examination",          value: encounter.examination    },
            { label: "Assessment / Diagnosis", value: encounter.assessment   },
            { label: "Procedures Performed", value: encounter.procedures     },
            { label: "Recommendations",      value: encounter.recommendations},
            { label: "Notes",                value: encounter.notes          },
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

          {![
            encounter.chiefComplaint,
            encounter.examination,
            encounter.assessment,
            encounter.procedures,
            encounter.recommendations,
            encounter.notes,
          ].some(Boolean) && (
            <div className="bg-white rounded-2xl border border-violet-100 p-8 text-center text-violet-400 text-sm">
              No clinical notes recorded for this encounter.
              {isDentist && (
                <button
                  onClick={() => setTab("ai")}
                  className="block mx-auto mt-2 text-violet-500 hover:text-violet-700 text-xs font-semibold underline"
                >
                  Use AI Assistant to draft notes →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Files */}
      {tab === "files" && canUseFiles && (
        <FilesTab
          clinicId={clinicId}
          encounterId={encounter.id}
          patientId={encounter.patientId}
          branchId={encounter.branchId}
          allowUpload
        />
      )}

      {/* Tab: AI Assistant (dentist only) */}
      {tab === "ai" && isDentist && (
        <div className="space-y-6">
          {/* Note suggestion */}
          <div>
            <h2 className="text-base font-bold text-violet-900 mb-3">Note Auto-Fill</h2>
            <AINoteSuggest
              clinicId={clinicId}
              encounterId={encounter.id}
              initialChiefComplaint={encounter.chiefComplaint ?? undefined}
              onAccept={(section, text) =>
                setAcceptedNotes((prev) => ({ ...prev, [section]: text }))
              }
            />
          </div>

          <hr className="border-violet-100" />

          {/* Treatment sequence */}
          <div>
            <h2 className="text-base font-bold text-violet-900 mb-1">Treatment Sequence Suggestion</h2>
            <p className="text-xs text-violet-400 mb-3">
              Paste or dictate the patient's tooth conditions to get a prioritized treatment sequence. Advisory only.
            </p>
            <AITreatmentPanel clinicId={clinicId} encounterId={encounter.id} />
          </div>
        </div>
      )}
    </div>
  );
}
