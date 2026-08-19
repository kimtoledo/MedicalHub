"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Camera, Mail, Phone, Clock, CheckCircle,
  X, Loader2, ChevronDown, ImageIcon, AlertCircle,
} from "lucide-react";
import type { AssessmentDetail } from "./page";
import { useConfirm } from "@/components/ConfirmDialogProvider";

const NEXT_STEP_OPTIONS = [
  { value: "in_clinic_visit", label: "Schedule an in-clinic visit" },
  { value: "prescription",    label: "Provide a prescription remotely" },
  { value: "monitoring",      label: "Monitor at home — no immediate action" },
  { value: "emergency",       label: "Emergency — see a dentist ASAP" },
  { value: "none",            label: "No action needed" },
] as const;

type NextStep = typeof NEXT_STEP_OPTIONS[number]["value"];

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function statusBadge(status: string) {
  if (status === "pending")  return { color: "bg-amber-100 text-amber-700",  Icon: Clock };
  if (status === "reviewed") return { color: "bg-green-100 text-green-700",  Icon: CheckCircle };
  return { color: "bg-gray-100 text-gray-500", Icon: X };
}

export default function RemoteConsultDetailClient({
  assessment,
  clinicId,
  isDentist,
}: {
  assessment: AssessmentDetail;
  clinicId: string;
  isDentist: boolean;
}) {
  const { color: badgeColor, Icon: StatusIcon } = statusBadge(assessment.status);
  const confirmDialog = useConfirm();

  // Photo viewer state
  const [viewerIdx, setViewerIdx]     = useState<number | null>(null);
  const [photoUrls, setPhotoUrls]     = useState<Record<number, string>>({});
  const [loadingIdx, setLoadingIdx]   = useState<number | null>(null);

  // Review form state
  const [showForm, setShowForm]       = useState(false);
  const [notes, setNotes]             = useState(assessment.dentistNotes ?? "");
  const [nextStep, setNextStep]       = useState<NextStep>("in_clinic_visit");
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted]     = useState(assessment.status === "reviewed");

  async function loadPhoto(idx: number) {
    if (photoUrls[idx]) { setViewerIdx(idx); return; }
    setLoadingIdx(idx);
    try {
      const res = await fetch(
        `/api/clinic/${clinicId}/remote-consults/${assessment.id}/photos/${idx}/url`,
        { credentials: "include", cache: "no-store" }
      );
      const body = await res.json() as { success: boolean; data?: { downloadUrl: string } };
      if (body.success && body.data) {
        setPhotoUrls((prev) => ({ ...prev, [idx]: body.data!.downloadUrl }));
        setViewerIdx(idx);
      }
    } finally {
      setLoadingIdx(null);
    }
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(
        `/api/clinic/${clinicId}/remote-consults/${assessment.id}/review`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dentistNotes: notes.trim(), nextStep }),
        }
      );
      const body = await res.json() as { success: boolean; error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to submit assessment");
      setSubmitted(true);
      setShowForm(false);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    const confirmed = await confirmDialog({ title: "Close consultation", message: "Close this consultation? No further action will be recorded.", tone: "danger" });
    if (!confirmed) return;
    await fetch(`/api/clinic/${clinicId}/remote-consults/${assessment.id}/close`, {
      method: "PATCH",
      credentials: "include",
    });
    window.location.href = "/app/dentist/remote-consults";
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-5">
      {/* Back + header */}
      <div>
        <Link href="/app/dentist/remote-consults"
          className="flex items-center gap-2 text-sm text-violet-500 hover:text-violet-700 mb-2">
          <ArrowLeft size={15} /> Remote Consults
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-violet-900">{assessment.patientName}</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-violet-400 flex-wrap">
              <span className="flex items-center gap-1"><Mail size={11} /> {assessment.patientEmail}</span>
              {assessment.patientPhone && <span className="flex items-center gap-1"><Phone size={11} /> {assessment.patientPhone}</span>}
              <span>{new Date(assessment.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</span>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold capitalize flex-shrink-0 ${badgeColor}`}>
            <StatusIcon size={11} /> {assessment.status}
          </span>
        </div>
      </div>

      {/* Complaint */}
      <div className="bg-white rounded-2xl border border-violet-100 p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2">Patient's Complaint</p>
        <p className="text-sm text-violet-900 whitespace-pre-wrap leading-relaxed">{assessment.complaint}</p>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-violet-50 flex items-center gap-2">
          <Camera size={14} className="text-violet-400" />
          <p className="text-xs font-bold text-violet-700">{assessment.photoCount} Photo{assessment.photoCount !== 1 ? "s" : ""}</p>
        </div>
        {assessment.photoCount === 0 ? (
          <p className="text-violet-400 text-sm text-center py-8">No photos attached</p>
        ) : (
          <div className="p-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
            {assessment.photos.map((photo, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => loadPhoto(idx)}
                className="relative aspect-square rounded-xl overflow-hidden bg-violet-50 hover:ring-2 hover:ring-violet-400 transition-all group"
              >
                {photoUrls[idx] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrls[idx]}
                    alt={photo.originalFilename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    {loadingIdx === idx ? (
                      <Loader2 size={16} className="text-violet-400 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon size={18} className="text-violet-300" />
                        <span className="text-[9px] text-violet-400 truncate px-1 max-w-full">
                          {photo.originalFilename.slice(0, 12)}
                        </span>
                      </>
                    )}
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] px-1 rounded">
                  {formatBytes(photo.sizeBytes)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {viewerIdx !== null && photoUrls[viewerIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setViewerIdx(null)}
        >
          <div className="relative max-w-3xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewerIdx(null)}
              className="absolute -top-3 -right-3 z-10 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100"
            >
              <X size={16} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrls[viewerIdx]}
              alt={`Photo ${viewerIdx + 1}`}
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
            />
            {assessment.photoCount > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                {assessment.photos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => loadPhoto(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === viewerIdx ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Existing review (if reviewed) */}
      {(assessment.status === "reviewed" || submitted) && assessment.dentistNotes && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-600" />
            <p className="text-xs font-bold text-green-700">Assessment Recorded</p>
            {assessment.reviewedAt && (
              <span className="text-[10px] text-green-500">
                {new Date(assessment.reviewedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}
              </span>
            )}
          </div>
          <p className="text-sm text-green-900 whitespace-pre-wrap">{assessment.dentistNotes}</p>
          {assessment.nextStep && (
            <p className="text-xs text-green-700 font-semibold">
              Recommendation:{" "}
              <span className="font-normal">
                {NEXT_STEP_OPTIONS.find((o) => o.value === assessment.nextStep)?.label ?? assessment.nextStep}
              </span>
            </p>
          )}
          <p className="text-[10px] text-green-500 italic">
            {assessment.emailSent === "true"
              ? "Patient has been notified by email."
              : "Email notification pending (configure email provider to enable)."}
          </p>
        </div>
      )}

      {/* Review form (dentist only, pending status) */}
      {isDentist && assessment.status === "pending" && !submitted && (
        <div>
          {!showForm ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Write Assessment
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 bg-white border border-violet-200 text-violet-500 hover:text-violet-700 text-sm font-semibold rounded-xl transition-colors"
              >
                Close without review
              </button>
            </div>
          ) : (
            <form onSubmit={handleReview} className="bg-white border border-violet-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <h2 className="font-bold text-violet-900 text-sm">Assessment Response</h2>

              {submitError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-violet-700 mb-1">Assessment Notes *</label>
                <textarea
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Based on the photos, I can see... My assessment is... I recommend..."
                  className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
                <p className="text-[10px] text-violet-400 mt-1">
                  This will be visible to the patient. Do not include sensitive patient data.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-violet-700 mb-1">Recommended Next Step *</label>
                <div className="relative">
                  <select
                    value={nextStep}
                    onChange={(e) => setNextStep(e.target.value as NextStep)}
                    className="w-full appearance-none px-3 py-2 rounded-xl border border-violet-200 text-sm text-violet-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 pr-8"
                  >
                    {NEXT_STEP_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  {submitting ? "Submitting…" : "Submit Assessment"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-violet-500 hover:text-violet-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Already reviewed — close option */}
      {assessment.status === "reviewed" && (
        <button
          type="button"
          onClick={handleClose}
          className="text-xs text-violet-400 hover:text-violet-600"
        >
          Close this consultation
        </button>
      )}
    </div>
  );
}
