"use client";

/**
 * AITreatmentPanel — treatment sequence suggestion panel.
 *
 * Dentist enters the odontogram summary (plain text or copied from the
 * odontogram page) → AI returns a prioritized treatment sequence.
 * Output is advisory only — dentist must manually create any treatment plan.
 */

import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, Clock, Star } from "lucide-react";
import AISuggestedBadge from "./AISuggestedBadge";
import VoiceInputButton from "./VoiceInputButton";

type SequenceItem = {
  priority: number;
  tooth: string;
  treatment: string;
  urgency: "urgent" | "routine" | "elective";
  rationale: string;
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; Icon: typeof AlertTriangle }> = {
  urgent:   { label: "Urgent",   color: "text-red-600 bg-red-50 border-red-200",   Icon: AlertTriangle },
  routine:  { label: "Routine",  color: "text-amber-600 bg-amber-50 border-amber-200",  Icon: Clock     },
  elective: { label: "Elective", color: "text-blue-600 bg-blue-50 border-blue-200",  Icon: Star        },
};

export default function AITreatmentPanel({
  clinicId,
  encounterId,
}: {
  clinicId: string;
  encounterId?: string;
}) {
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [sequence, setSequence] = useState<SequenceItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isReady = summary.trim().length > 0 && !loading;

  async function handleSuggest() {
    if (!isReady) return;
    setLoading(true);
    setError(null);
    setSequence(null);

    try {
      const res = await fetch(`/api/clinic/${clinicId}/ai/suggest-treatment-sequence`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          odontogramSummary: summary.trim(),
          notes: notes.trim() || undefined,
          encounterId,
        }),
      });
      const data = await res.json() as { success: boolean; data?: { sequence: SequenceItem[] }; error?: { code: string; message: string } };
      if (!data.success) {
        setError(
          data.error?.code === "NOT_CONFIGURED"
            ? "AI is not configured. Set OPENAI_API_KEY to enable this feature."
            : data.error?.message ?? "AI request failed"
        );
      } else {
        setSequence(data.data?.sequence ?? []);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Input section */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500" />
          <h3 className="font-semibold text-violet-900 text-sm">AI Treatment Sequence</h3>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-violet-700">Odontogram / Conditions Summary *</label>
            <VoiceInputButton onTranscript={(t) => setSummary((v) => v + (v ? "\n" : "") + t)} />
          </div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="e.g. Tooth 16: mesio-occlusal caries&#10;Tooth 36: periapical abscess, needs RCT or extraction&#10;Teeth 14-15: missing (edentulous)&#10;Tooth 21: discolored, needs veneer"
            className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-violet-700">Additional context (optional)</label>
            <VoiceInputButton onTranscript={(t) => setNotes((v) => v + (v ? " " : "") + t)} />
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Patient has anxiety, prefers phased treatment"
            className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <button
          type="button"
          onClick={handleSuggest}
          disabled={!isReady}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {loading ? "Thinking…" : "Suggest Sequence"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Sequence result */}
      {sequence && sequence.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AISuggestedBadge />
            <p className="text-xs text-violet-400">Verify each item with your clinical judgment before creating a treatment plan</p>
          </div>
          {sequence.map((item) => {
            const cfg = URGENCY_CONFIG[item.urgency] ?? URGENCY_CONFIG.routine;
            const Icon = cfg.Icon;
            return (
              <div
                key={item.priority}
                className={`bg-white rounded-2xl border p-4 flex items-start gap-3 ${cfg.color.split(" ").slice(1).join(" ")}`}
              >
                <span className="w-6 h-6 rounded-full bg-white border flex items-center justify-center flex-shrink-0 text-xs font-bold text-violet-700">
                  {item.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-violet-900">{item.treatment}</span>
                    <span className="text-xs text-violet-400">· {item.tooth}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.color}`}>
                      <Icon size={9} /> {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-violet-500">{item.rationale}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sequence?.length === 0 && (
        <p className="text-sm text-violet-400 text-center py-4">
          No treatment sequence suggestions were generated for the provided summary.
        </p>
      )}
    </div>
  );
}
