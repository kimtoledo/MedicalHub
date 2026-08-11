"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera, Clock, CheckCircle, XCircle, ChevronRight,
  Copy, Check, ExternalLink, User, Mail, Phone,
} from "lucide-react";
import type { ConsultListItem } from "./page";

const STATUS_TABS = [
  { id: "pending",  label: "Pending",  Icon: Clock         },
  { id: "reviewed", label: "Reviewed", Icon: CheckCircle   },
  { id: "closed",   label: "Closed",   Icon: XCircle       },
];

const NEXT_STEP_LABELS: Record<string, string> = {
  in_clinic_visit: "In-clinic visit",
  prescription:    "Prescription",
  monitoring:      "Monitor at home",
  emergency:       "Emergency — see dentist ASAP",
  none:            "No action needed",
};

function statusBadge(status: string) {
  if (status === "pending")  return "bg-amber-100 text-amber-700";
  if (status === "reviewed") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-500";
}

export default function RemoteConsultsClient({
  consults,
  total,
  currentPage,
  currentStatus,
  clinicId: _clinicId,
  shareUrl,
  isDentist,
}: {
  consults: ConsultListItem[];
  total: number;
  currentPage: number;
  currentStatus: string;
  clinicId: string;
  shareUrl: string;
  isDentist: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function setTab(status: string) {
    router.push(`/app/dentist/remote-consults?status=${status}`);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-violet-900">Remote Consults</h1>
          <p className="text-violet-500 text-sm mt-0.5">
            Photo consultations submitted by patients
          </p>
        </div>
        {/* Share link card */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">Patient link</p>
            <p className="text-xs text-violet-700 truncate max-w-[220px]">{shareUrl}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={copyLink}
              title="Copy link"
              className="p-1.5 rounded-lg hover:bg-violet-200 text-violet-500 transition-colors"
            >
              {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              title="Preview"
              className="p-1.5 rounded-lg hover:bg-violet-200 text-violet-500 transition-colors"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-violet-50 p-1 rounded-xl w-fit">
        {STATUS_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              currentStatus === id
                ? "bg-white text-violet-900 shadow-sm"
                : "text-violet-500 hover:text-violet-700"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        {consults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Camera size={36} className="text-violet-200" />
            <p className="text-violet-400 text-sm font-medium">
              No {currentStatus} consultations
            </p>
            {currentStatus === "pending" && (
              <p className="text-xs text-violet-300 text-center max-w-xs">
                Share the patient link above so patients can submit photo consult requests.
              </p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-violet-50">
            {consults.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/dentist/remote-consults/${c.id}`}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-violet-50/60 transition-colors group"
                >
                  {/* Photo count badge */}
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="flex flex-col items-center">
                      <Camera size={13} className="text-violet-500" />
                      <span className="text-[9px] font-bold text-violet-500">{c.photoCount}</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-violet-900 text-sm">{c.patientName}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${statusBadge(c.status)}`}>
                        {c.status}
                      </span>
                      {c.nextStep && c.status === "reviewed" && (
                        <span className="text-[10px] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded">
                          {NEXT_STEP_LABELS[c.nextStep] ?? c.nextStep}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-violet-600 mt-0.5 line-clamp-2">{c.complaint}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-violet-400 flex-wrap">
                      <span className="flex items-center gap-0.5"><Mail size={9} /> {c.patientEmail}</span>
                      {c.patientPhone && <span className="flex items-center gap-0.5"><Phone size={9} /> {c.patientPhone}</span>}
                      <span>
                        {new Date(c.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                      </span>
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
              <Link href={`/app/dentist/remote-consults?status=${currentStatus}&page=${currentPage - 1}`}
                className="px-3 py-1.5 bg-white border border-violet-200 rounded-lg hover:bg-violet-50">← Prev</Link>
            )}
            {currentPage * 20 < total && (
              <Link href={`/app/dentist/remote-consults?status=${currentStatus}&page=${currentPage + 1}`}
                className="px-3 py-1.5 bg-white border border-violet-200 rounded-lg hover:bg-violet-50">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
