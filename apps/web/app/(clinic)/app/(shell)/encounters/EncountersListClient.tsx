"use client";

import Link from "next/link";
import { ClipboardList, ChevronRight, User, Calendar } from "lucide-react";
import type { EncounterListItem } from "./page";

const STATUS_COLORS: Record<string, string> = {
  final: "bg-green-100 text-green-700",
  draft: "bg-amber-100 text-amber-700",
};

export default function EncountersListClient({
  encounters,
  clinicId: _clinicId,
}: {
  encounters: EncounterListItem[];
  clinicId: string;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-violet-900">Encounters</h1>
        <p className="text-violet-500 text-sm mt-0.5">
          Clinical visit records — notes, procedures, and uploaded files
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        {encounters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList size={36} className="text-violet-200" />
            <p className="text-violet-400 text-sm font-medium">No encounters recorded yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-violet-50">
            {encounters.map((enc) => (
              <li key={enc.id}>
                <Link
                  href={`/app/encounters/${enc.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-violet-50/60 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList size={16} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-violet-900 text-sm">
                        {enc.patientFirstName} {enc.patientLastName}
                      </span>
                      <span className="text-xs text-violet-400 bg-violet-50 px-1.5 py-0.5 rounded">
                        {enc.patientNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${STATUS_COLORS[enc.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {enc.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-violet-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {enc.date}
                      </span>
                      {enc.dentistFirstName && (
                        <span className="flex items-center gap-1">
                          <User size={11} /> Dr. {enc.dentistFirstName} {enc.dentistLastName}
                        </span>
                      )}
                      {enc.chiefComplaint && (
                        <span className="truncate max-w-[200px]">{enc.chiefComplaint}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-violet-300 group-hover:text-violet-500 flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
