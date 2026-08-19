"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity, ImageIcon, Loader2, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, ShieldAlert,
} from "lucide-react";

type Analysis = {
  id: string;
  fileId: string;
  status: "queued" | "completed" | "failed";
  model: string;
  findings: Array<{ label: string; confidence: number; advisory: true }>;
  oralHealthScore: number | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  failureReason: string | null;
  createdAt: string;
};

type RadiographFile = { id: string; originalFilename: string; createdAt: string };

function formatManila(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

export default function AiImagingTab({ clinicId, patientId, canConfirm }: { clinicId: string; patientId: string; canConfirm: boolean }) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [radiographs, setRadiographs] = useState<RadiographFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [analysesRes, filesRes] = await Promise.all([
      fetch(`/api/clinic/${clinicId}/ai-imaging/patients/${patientId}`, { credentials: "include" }),
      fetch(`/api/clinic/${clinicId}/files?patientId=${patientId}&pageSize=50`, { credentials: "include" }),
    ]);
    setLoading(false);
    if (analysesRes.ok) {
      const payload = await analysesRes.json();
      setAnalyses([...payload.data].reverse());
    } else {
      const payload = await analysesRes.json().catch(() => null);
      setError(payload?.error?.message ?? "Unable to load AI imaging analyses.");
    }
    if (filesRes.ok) {
      const payload = await filesRes.json();
      setRadiographs((payload.data as (RadiographFile & { fileType: string })[]).filter((file) => file.fileType === "radiograph"));
    }
  }, [clinicId, patientId]);

  useEffect(() => { void load(); }, [load]);

  async function analyze(fileId: string) {
    setRunningId(fileId);
    setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/ai-imaging/radiographs`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    const payload = await response.json();
    setRunningId(null);
    if (!response.ok) { setError(payload.error?.message ?? "Unable to run AI imaging analysis."); return; }
    await load();
  }

  async function confirm(analysisId: string) {
    setError(null);
    const response = await fetch(`/api/clinic/${clinicId}/ai-imaging/${analysisId}/confirm`, { method: "POST", credentials: "include" });
    if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.error?.message ?? "Unable to confirm this analysis."); return; }
    await load();
  }

  const completed = analyses.filter((a) => a.status === "completed" && a.oralHealthScore !== null);
  const latest = completed[0] ?? null;
  const previous = completed[1] ?? null;
  const trend = latest && previous && latest.oralHealthScore !== null && previous.oralHealthScore !== null
    ? latest.oralHealthScore - previous.oralHealthScore
    : null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-violet-50 px-4 py-3 text-xs text-violet-600">
        <ShieldAlert size={13} className="mr-1 inline" />
        This baseline computes an oral health score from odontogram, treatment, and visit history only — it does not yet visually interpret radiograph images. Any future finding is advisory and requires dentist confirmation before it informs care.
      </div>

      <section className="rounded-2xl border border-violet-100 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-900"><Activity size={15} /> Oral health score</h3>
        {loading ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : !latest ? (
          <p className="text-xs text-violet-400">No score yet — run an analysis on a radiograph below.</p>
        ) : (
          <div className="flex items-center gap-4">
            <p className="text-4xl font-extrabold text-violet-900">{latest.oralHealthScore}<span className="text-base font-medium text-violet-400">/100</span></p>
            <div className="text-xs text-slate-500">
              <p>As of {formatManila(latest.createdAt)}</p>
              {trend !== null && (
                <p className={`mt-0.5 flex items-center gap-1 font-semibold ${trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-600" : "text-slate-500"}`}>
                  {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                  {trend === 0 ? "Unchanged" : `${trend > 0 ? "+" : ""}${trend} since previous score`}
                </p>
              )}
            </div>
          </div>
        )}
        {completed.length > 1 && (
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            {completed.slice(0, 6).map((a) => (
              <li key={a.id} className="rounded-lg bg-slate-50 px-2 py-1">{a.oralHealthScore} · {new Date(a.createdAt).toLocaleDateString("en-PH")}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-violet-100 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-900"><ImageIcon size={15} /> Radiographs</h3>
        {radiographs.length === 0 ? (
          <p className="text-xs text-violet-400">No radiograph files uploaded for this patient yet.</p>
        ) : (
          <ul className="space-y-2">
            {radiographs.map((file) => (
              <li key={file.id} className="flex items-center justify-between rounded-xl border border-violet-50 px-3 py-2">
                <div>
                  <p className="text-sm text-violet-900">{file.originalFilename}</p>
                  <p className="text-xs text-slate-400">Uploaded {formatManila(file.createdAt)}</p>
                </div>
                <button
                  onClick={() => void analyze(file.id)}
                  disabled={runningId === file.id}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {runningId === file.id ? <Loader2 size={12} className="animate-spin" /> : null} {runningId === file.id ? "Analyzing…" : "Run analysis"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle size={13} /> {error}</p>}

      <section className="rounded-2xl border border-violet-100 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-violet-900">Analysis history</h3>
        {analyses.length === 0 ? (
          <p className="text-xs text-violet-400">No analyses yet.</p>
        ) : (
          <ul className="space-y-2">
            {analyses.map((a) => (
              <li key={a.id} className="rounded-xl border border-violet-50 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">{formatManila(a.createdAt)}</p>
                    {a.status === "completed" && <p className="text-sm text-violet-900">Score {a.oralHealthScore} · {a.findings.length === 0 ? "No AI-detected findings" : `${a.findings.length} advisory finding(s)`}</p>}
                    {a.status === "failed" && <p className="text-sm text-red-600">Analysis failed{a.failureReason ? `: ${a.failureReason}` : ""}</p>}
                    {a.status === "queued" && <p className="text-sm text-amber-600">Queued…</p>}
                  </div>
                  {a.status === "completed" && (
                    a.confirmedAt ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={13} /> Reviewed {formatManila(a.confirmedAt)}</span>
                    ) : canConfirm ? (
                      <button onClick={() => void confirm(a.id)} className="rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50">Mark reviewed</button>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600">Awaiting dentist review</span>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
