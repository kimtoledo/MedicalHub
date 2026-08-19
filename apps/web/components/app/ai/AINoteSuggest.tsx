"use client";

/**
 * AI Note Suggestion panel.
 *
 * Shown as a drawer/panel inside the encounter detail page.
 * Dentist enters context → clicks "Suggest Notes" → AI streams SOAP notes.
 * Dentist can accept individual sections or discard all.
 */

import { useRef, useState } from "react";
import { Sparkles, Loader2, Check, X, ChevronDown } from "lucide-react";
import VoiceInputButton from "./VoiceInputButton";
import AISuggestedBadge from "./AISuggestedBadge";

type NoteSuggestion = {
  examination: string;
  assessment: string;
  recommendations: string;
};

type Section = keyof NoteSuggestion;

const SECTION_LABELS: Record<Section, string> = {
  examination:     "Examination Findings",
  assessment:      "Assessment / Diagnosis",
  recommendations: "Recommendations",
};

export default function AINoteSuggest({
  clinicId,
  encounterId,
  initialChiefComplaint,
  onAccept,
}: {
  clinicId: string;
  encounterId?: string;
  initialChiefComplaint?: string;
  /** Called with the accepted section text when dentist clicks Accept. */
  onAccept: (section: Section, text: string) => void;
}) {
  const [chiefComplaint, setChiefComplaint] = useState(initialChiefComplaint ?? "");
  const [services, setServices] = useState("");
  const [toothRefs, setToothRefs] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [rawStream, setRawStream] = useState(""); // accumulated stream text
  const [suggestion, setSuggestion] = useState<NoteSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Set<Section>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const isReady = chiefComplaint.trim().length > 0 && !streaming;

  async function handleSuggest() {
    if (!isReady) return;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setStreaming(true);
    setRawStream("");
    setSuggestion(null);
    setError(null);
    setAccepted(new Set());

    try {
      const res = await fetch(`/api/clinic/${clinicId}/ai/suggest-notes`, {
        method: "POST",
        credentials: "include",
        signal: abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chiefComplaint: chiefComplaint.trim(),
          services:    services.trim() ? services.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          toothRefs:   toothRefs.trim() ? toothRefs.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          encounterId,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server returned ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload) as { delta?: string; error?: { code: string; message: string } };
            if (parsed.error) {
              setError(parsed.error.message ?? "AI request failed");
              return;
            }
            if (parsed.delta) {
              accumulated += parsed.delta;
              setRawStream(accumulated);
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      // Try to parse the final accumulated text as JSON
      try {
        const cleaned = accumulated.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleaned) as NoteSuggestion;
        setSuggestion(parsed);
      } catch {
        // If JSON parsing fails, show the raw text
        setSuggestion({
          examination: accumulated,
          assessment: "",
          recommendations: "",
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to get AI suggestion");
    } finally {
      setStreaming(false);
    }
  }

  function handleAccept(section: Section) {
    if (!suggestion) return;
    onAccept(section, suggestion[section]);
    setAccepted((prev) => new Set([...Array.from(prev), section]));
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  return (
    <div className="space-y-4">
      {/* Context inputs */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500" />
          <h3 className="font-semibold text-violet-900 text-sm">AI Note Assistant</h3>
          <span className="text-[10px] text-violet-400">GPT-4o · Draft only</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-violet-700">Chief Complaint *</label>
            <VoiceInputButton onTranscript={(t) => setChiefComplaint((v) => v + (v ? " " : "") + t)} />
          </div>
          <input
            type="text"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="e.g. Tooth pain on lower left, sensitivity to cold"
            className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-violet-700">Services / Procedures</label>
              <VoiceInputButton onTranscript={(t) => setServices((v) => v + (v ? ", " : "") + t)} />
            </div>
            <input
              type="text"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              placeholder="e.g. Restoration, Extraction (comma-sep)"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-700 mb-1">Tooth References (FDI)</label>
            <input
              type="text"
              value={toothRefs}
              onChange={(e) => setToothRefs(e.target.value)}
              placeholder="e.g. 36, 37 (comma-sep)"
              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {streaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-200 transition-colors"
            >
              <X size={13} /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSuggest}
              disabled={!isReady}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
            >
              <Sparkles size={13} />
              Suggest Notes
            </button>
          )}
          {(suggestion || rawStream) && !streaming && (
            <button
              type="button"
              onClick={() => { setSuggestion(null); setRawStream(""); setAccepted(new Set()); }}
              className="px-3 py-2 text-sm text-violet-500 hover:text-violet-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error === "AI provider not configured"
            ? "AI is not configured. Ask your administrator to add an OPENAI_API_KEY."
            : error}
        </div>
      )}

      {/* Streaming raw text (before JSON parse) */}
      {streaming && rawStream && !suggestion && (
        <div className="bg-white rounded-2xl border border-violet-100 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 size={13} className="animate-spin text-violet-500" />
            <AISuggestedBadge />
          </div>
          <p className="text-sm text-violet-800 whitespace-pre-wrap font-mono text-xs">{rawStream}</p>
        </div>
      )}

      {/* Parsed suggestion sections */}
      {suggestion && (
        <div className="space-y-3">
          {(Object.keys(SECTION_LABELS) as Section[])
            .filter((s) => suggestion[s]?.trim())
            .map((section) => (
              <div
                key={section}
                className={`bg-white rounded-2xl border p-5 transition-colors ${
                  accepted.has(section) ? "border-green-200 bg-green-50/50" : "border-violet-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                        {SECTION_LABELS[section]}
                      </p>
                      <AISuggestedBadge />
                    </div>
                    <p className="text-sm text-violet-900 whitespace-pre-wrap">{suggestion[section]}</p>
                  </div>
                  {accepted.has(section) ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-semibold flex-shrink-0">
                      <Check size={13} /> Accepted
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAccept(section)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                    >
                      <Check size={12} /> Accept
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
