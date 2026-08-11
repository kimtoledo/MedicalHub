"use client";

/**
 * AIRecallBanner — shown on finalized encounters.
 *
 * Auto-fetches an AI recall interval suggestion and shows a dismissible
 * informational banner. This is a REVIEW-ONLY action — no recall is booked
 * or persisted here. Booking happens in the Recall module (MVP 2).
 *
 * The "Got it — noted" action dismisses the banner only; the dentist is
 * expected to manually schedule the recall from the Recall module.
 */

import { useEffect, useState } from "react";
import { CalendarClock, Sparkles, X, BookMarked } from "lucide-react";

type RecallSuggestion = {
  intervalMonths: number;
  label: string;
  rationale: string;
};

export default function AIRecallBanner({
  clinicId,
  encounterId,
  procedures,
  encounterDate,
}: {
  clinicId: string;
  encounterId: string;
  procedures: string[];
  encounterDate: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "dismissed" | "error">(
    "idle"
  );
  const [suggestion, setSuggestion] = useState<RecallSuggestion | null>(null);

  useEffect(() => {
    if (procedures.length === 0) return;
    setStatus("loading");

    fetch(`/api/clinic/${clinicId}/ai/suggest-recall`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        procedures,
        lastVisitDate: encounterDate,
        encounterId,
      }),
    })
      .then((r) => r.json())
      .then(
        (data: {
          success: boolean;
          data?: RecallSuggestion;
          error?: { code: string };
        }) => {
          if (data.success && data.data) {
            setSuggestion(data.data);
            setStatus("ready");
          } else {
            // Silently hide — AI not configured or other error is non-blocking
            setStatus("dismissed");
          }
        }
      )
      .catch(() => setStatus("dismissed"));
  }, [clinicId, encounterId, procedures, encounterDate]);

  if (status !== "ready" || !suggestion) return null;

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
        <CalendarClock size={16} className="text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-sm font-semibold text-violet-900">
            AI recall reminder: {suggestion.label}
          </p>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-200 text-violet-700 text-[10px] font-bold">
            <Sparkles size={9} /> AI-suggested
          </span>
        </div>
        <p className="text-xs text-violet-500 mb-0.5">{suggestion.rationale}</p>
        <p className="text-[10px] text-violet-400 italic">
          Review only — schedule the recall from the Recall module.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => setStatus("dismissed")}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <BookMarked size={12} /> Got it — noted
          </button>
          <button
            type="button"
            onClick={() => setStatus("dismissed")}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-violet-400 hover:text-violet-600 text-xs"
          >
            <X size={12} /> Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
