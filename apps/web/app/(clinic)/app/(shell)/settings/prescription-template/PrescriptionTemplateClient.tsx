"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Pen,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import type { DentistDefaults } from "./page";
import RxTemplateClassic from "@/components/prescriptions/RxTemplateClassic";
import RxTemplateModern from "@/components/prescriptions/RxTemplateModern";
import RxTemplateMinimal from "@/components/prescriptions/RxTemplateMinimal";

// ---------------------------------------------------------------------------
// Template preview cards (miniature static thumbnails)
// ---------------------------------------------------------------------------

const TEMPLATES = [
  {
    id: "classic",
    label: "Classic",
    description: "Traditional black-and-white prescription pad layout",
    preview: (
      <div className="w-full h-28 bg-white rounded-lg border border-slate-200 p-2 text-[6px] font-serif overflow-hidden">
        <div className="border-b border-slate-700 pb-1 mb-1 text-center">
          <div className="font-bold text-[7px]">DENTAL CLINIC</div>
          <div className="text-slate-500">123 Sample Street, Manila</div>
        </div>
        <div className="text-center font-bold text-[7px] mb-1 border-b border-slate-700">PRESCRIPTION</div>
        <div className="text-[5.5px] flex justify-between mb-1">
          <span>Patient: Juan dela Cruz</span><span>Date: Aug 14, 2026</span>
        </div>
        <div className="text-[8px] font-bold mb-1">℞</div>
        <div className="ml-1 space-y-0.5">
          <div className="font-semibold">Amoxicillin 500mg</div>
          <div className="text-slate-500">1 cap TID × 7 days</div>
        </div>
      </div>
    ),
  },
  {
    id: "modern",
    label: "Modern",
    description: "Violet accent header with color-coded medicine cards",
    preview: (
      <div className="w-full h-28 bg-white rounded-lg border border-slate-200 overflow-hidden text-[6px] font-sans">
        <div className="px-2 py-2" style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)" }}>
          <div className="font-bold text-[7px] text-white">DENTAL CLINIC</div>
          <div className="text-violet-200 text-[5.5px]">123 Sample Street, Manila</div>
        </div>
        <div className="px-2 py-1">
          <div className="flex justify-between mb-1">
            <div className="bg-violet-50 rounded px-1 py-0.5 text-[5.5px]">
              <div className="text-violet-500 font-semibold">Patient</div>
              <div className="font-bold">Juan dela Cruz</div>
            </div>
            <div className="bg-violet-50 rounded px-1 py-0.5 text-[5.5px] text-right">
              <div className="text-violet-500 font-semibold">Prescribed by</div>
              <div className="font-bold">Dr. Reyes</div>
            </div>
          </div>
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[8px] font-bold" style={{ color: "#7c3aed" }}>℞</span>
            <span className="text-[5px] text-slate-400 font-semibold uppercase tracking-widest">Medications</span>
          </div>
          <div className="rounded border border-violet-100 px-1 py-0.5 text-[5.5px]">
            <div className="font-bold">Amoxicillin 500mg</div>
            <div className="flex gap-0.5 mt-0.5">
              <span className="bg-violet-50 text-violet-700 px-0.5 rounded-sm border border-violet-200">1 cap TID</span>
              <span className="bg-slate-50 text-slate-600 px-0.5 rounded-sm border border-slate-200">7 days</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Compact A5 layout — ideal for quick prescriptions",
    preview: (
      <div className="w-full h-28 bg-white rounded-lg border border-slate-200 p-2 text-[6px] font-sans overflow-hidden">
        <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-1">
          <div>
            <div className="font-bold text-[6.5px]">Dental Clinic</div>
            <div className="text-slate-400 text-[5px]">123 Sample St · +63 2 8888 0000</div>
          </div>
          <div className="text-right text-[5.5px] font-semibold">Aug 14, 2026</div>
        </div>
        <div className="flex justify-between text-[5.5px] mb-1">
          <div><span className="text-slate-400">Pt: </span><span className="font-semibold">Juan dela Cruz</span></div>
          <div><span className="text-slate-400">Dr: </span><span className="font-semibold">Reyes</span></div>
        </div>
        <div className="text-[10px] font-bold mb-0.5">℞</div>
        <div className="text-[5.5px] border-b border-slate-100 pb-0.5">
          <span className="font-semibold">Amoxicillin 500mg</span>
          <span className="text-slate-500 ml-1">1 cap TID · 7 days</span>
        </div>
      </div>
    ),
  },
] as const;

type TemplateId = "classic" | "modern" | "minimal";
type Tab = "draw" | "upload";

// ---------------------------------------------------------------------------
// Sample data used in the live preview
// ---------------------------------------------------------------------------

const PREVIEW_TODAY = new Date().toISOString();

const PREVIEW_ITEMS = [
  {
    id: "preview-1",
    medicineName: "Amoxicillin 500mg",
    dosage: "1 capsule",
    frequency: "3× daily",
    duration: "7 days",
    specialInstructions: "Take after meals",
    sortOrder: 0,
  },
  {
    id: "preview-2",
    medicineName: "Ibuprofen 400mg",
    dosage: "1 tablet",
    frequency: "Every 6 hours as needed",
    duration: "3 days",
    specialInstructions: null,
    sortOrder: 1,
  },
];

// ---------------------------------------------------------------------------
// Live preview panel
// ---------------------------------------------------------------------------

/**
 * Renders the selected template at a reduced scale inside a clipping container.
 * The template components render at their natural print dimensions (210 mm or 148 mm
 * wide); we scale them down to fit the panel width while preserving proportions.
 */
function LivePreviewPanel({
  templateId,
  defaults,
  signatureUrl,
}: {
  templateId: TemplateId;
  defaults: DentistDefaults;
  signatureUrl: string | null;
}) {
  // Natural rendered pixel widths for each template
  // 210 mm @ 96 dpi ≈ 794 px  |  148 mm @ 96 dpi ≈ 559 px
  const isMinimal = templateId === "minimal";
  const NATURAL_W = isMinimal ? 559 : 794;

  // We want the preview to fill whatever container width the panel provides.
  // Use a ref to measure the container, then recompute scale on resize.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(isMinimal ? 0.68 : 0.55);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / NATURAL_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [NATURAL_W]);

  const TemplateComponent =
    templateId === "modern"
      ? RxTemplateModern
      : templateId === "minimal"
      ? RxTemplateMinimal
      : RxTemplateClassic;

  const previewProps = {
    clinicName: defaults.clinicName,
    clinicAddress: defaults.clinicAddress,
    clinicPhone: defaults.clinicPhone,
    clinicLogoUrl: defaults.clinicLogoUrl,
    patientName: "Sample Patient",
    patientNumber: "001",
    dentistName: defaults.dentistName,
    prcLicenseNumber: defaults.prcLicenseNumber,
    signatureUrl,
    issuedAt: PREVIEW_TODAY,
    notes: null,
    items: PREVIEW_ITEMS,
    amendedFromId: null,
  };

  // The scaled height of the content that we want to show.
  // We cap it to keep the panel a reasonable size (shows the full doc vertically).
  const naturalH = isMinimal ? 794 : 1123;
  const scaledH = Math.round(naturalH * scale);

  return (
    <div ref={wrapperRef} className="w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      {/* Label bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Live Preview</span>
        <span className="text-xs text-slate-400 italic">Sample data · not a real prescription</span>
      </div>

      {/* Scaled template */}
      <div
        className="overflow-hidden"
        style={{ height: `${scaledH}px` }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${NATURAL_W}px`,
          }}
        >
          <TemplateComponent {...previewProps} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PrescriptionTemplateClient({
  clinicId,
  defaults,
}: {
  clinicId: string;
  defaults: DentistDefaults;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(
    (defaults.templateId as TemplateId) ?? "classic"
  );
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const [signatureUrl, setSignatureUrl] = useState<string | null>(defaults.signatureUrl ?? null);
  const [signatureTab, setSignatureTab] = useState<Tab>("draw");
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  // Mobile: collapsible preview section
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<import("signature_pad").default | null>(null);

  // Initialize signature_pad when the draw tab is active
  useEffect(() => {
    if (signatureTab !== "draw" || !canvasRef.current) return;
    let pad: import("signature_pad").default | null = null;
    import("signature_pad").then((mod) => {
      if (!canvasRef.current) return;
      pad = new mod.default(canvasRef.current, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "#1e293b",
        minWidth: 1,
        maxWidth: 3,
      });
      padRef.current = pad;
    });
    return () => {
      pad?.off();
      padRef.current = null;
    };
  }, [signatureTab]);

  async function handleSaveTemplate() {
    setTemplateSaving(true);
    setTemplateError(null);
    setTemplateSaved(false);
    try {
      const res = await fetch(`/api/clinic/${clinicId}/prescriptions/template`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });
      if (res.ok) {
        setTemplateSaved(true);
        setTimeout(() => setTemplateSaved(false), 3000);
      } else {
        const json = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setTemplateError(json.error?.message ?? "Failed to save template preference.");
      }
    } catch {
      setTemplateError("Network error. Please try again.");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleSaveSignature(dataUrl: string) {
    setSignatureSaving(true);
    setSignatureError(null);
    setSignatureSaved(false);
    try {
      const res = await fetch(`/api/clinic/${clinicId}/prescriptions/signature`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData: dataUrl }),
      });
      if (res.ok) {
        setSignatureUrl(dataUrl);
        setSignatureSaved(true);
        setTimeout(() => setSignatureSaved(false), 3000);
      } else {
        const json = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setSignatureError(json.error?.message ?? "Failed to save signature.");
      }
    } catch {
      setSignatureError("Network error. Please try again.");
    } finally {
      setSignatureSaving(false);
    }
  }

  function handleSaveDrawn() {
    if (!padRef.current) return;
    if (padRef.current.isEmpty()) {
      setSignatureError("Please draw your signature first.");
      return;
    }
    const dataUrl = padRef.current.toDataURL("image/png");
    void handleSaveSignature(dataUrl);
  }

  function handleClearCanvas() {
    padRef.current?.clear();
  }

  function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSignatureError("Please upload an image file (PNG, JPG, or SVG).");
      return;
    }
    setSignatureError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      void handleSaveSignature(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveSignature() {
    await handleSaveSignature("");
    setSignatureUrl(null);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/app/prescriptions"
          className="inline-flex items-center gap-2 text-sm text-violet-500 hover:text-violet-700 mb-4"
        >
          <ArrowLeft size={15} /> Back to Prescriptions
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Prescription Template & Signature</h1>
        <p className="text-sm text-slate-500 mt-1">
          Choose your preferred layout and set your signature. These are saved to your dentist profile
          and will be used on all new prescriptions you issue.
        </p>
      </div>

      {/* ── Two-column layout on large screens ── */}
      <div className="lg:flex lg:gap-8 lg:items-start">

        {/* ── Left column: settings ── */}
        <div className="lg:flex-1 space-y-6 min-w-0">

          {/* Template selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Prescription Layout</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t.id); setTemplateSaved(false); }}
                  className={`relative rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                    selectedTemplate === t.id
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"
                  }`}
                >
                  {selectedTemplate === t.id && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
                      <Check size={11} className="text-white" />
                    </span>
                  )}
                  {t.preview}
                  <p className="mt-2 font-semibold text-sm text-slate-800">{t.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>

            {templateError && (
              <p className="text-sm text-red-600 flex items-center gap-2 mb-3">
                <AlertCircle size={14} /> {templateError}
              </p>
            )}
            {templateSaved && (
              <p className="text-sm text-green-600 flex items-center gap-2 mb-3">
                <CheckCircle size={14} /> Template preference saved.
              </p>
            )}

            <button
              onClick={handleSaveTemplate}
              disabled={templateSaving || selectedTemplate === (defaults.templateId as TemplateId)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {templateSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {templateSaving ? "Saving…" : "Save Layout"}
            </button>
          </div>

          {/* ── Mobile: collapsible preview ── */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobilePreviewOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Eye size={15} className="text-violet-500" />
                {mobilePreviewOpen ? "Hide preview" : "Show live preview with your data"}
              </span>
              {mobilePreviewOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {mobilePreviewOpen && (
              <div className="mt-3">
                <LivePreviewPanel
                  templateId={selectedTemplate}
                  defaults={defaults}
                  signatureUrl={signatureUrl}
                />
              </div>
            )}
          </div>

          {/* Signature setup */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Signature</h2>
            <p className="text-xs text-slate-500 mb-4">
              Your signature appears at the bottom of every prescription you issue.
              Draw it with your mouse/finger or upload an image file.
            </p>

            {/* Current signature preview */}
            {signatureUrl && (
              <div className="mb-4 flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signatureUrl}
                  alt="Current signature"
                  className="h-14 w-auto object-contain border border-slate-200 rounded bg-white p-1"
                />
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-600">Current signature</p>
                  <p className="text-xs text-slate-400 mt-0.5">Draw or upload a new one to replace it</p>
                  <button
                    onClick={handleRemoveSignature}
                    disabled={signatureSaving}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-4 gap-4">
              {(["draw", "upload"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setSignatureTab(tab); setSignatureError(null); }}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    signatureTab === tab
                      ? "border-violet-500 text-violet-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab === "draw" ? (
                    <span className="flex items-center gap-2"><Pen size={13} /> Draw</span>
                  ) : (
                    <span className="flex items-center gap-2"><Upload size={13} /> Upload</span>
                  )}
                </button>
              ))}
            </div>

            {signatureTab === "draw" && (
              <div>
                <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={160}
                    className="block w-full touch-none cursor-crosshair"
                    style={{ height: "160px" }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5 text-center">
                  Draw your signature above using mouse or finger
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleClearCanvas}
                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {signatureTab === "upload" && (
              <div>
                <label className="block w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer p-6 text-center transition-colors">
                  <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Click to upload signature image</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, or GIF (transparent background recommended)</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleUploadFile}
                    disabled={signatureSaving}
                  />
                </label>
              </div>
            )}

            {signatureError && (
              <p className="text-sm text-red-600 flex items-center gap-2 mt-3">
                <AlertCircle size={14} /> {signatureError}
              </p>
            )}
            {signatureSaved && (
              <p className="text-sm text-green-600 flex items-center gap-2 mt-3">
                <CheckCircle size={14} /> Signature saved successfully.
              </p>
            )}

            {signatureTab === "draw" && (
              <button
                onClick={handleSaveDrawn}
                disabled={signatureSaving}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
              >
                {signatureSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {signatureSaving ? "Saving…" : "Save Signature"}
              </button>
            )}
          </div>

        </div>

        {/* ── Right column: live preview (desktop only) ── */}
        <div className="hidden lg:block lg:w-[480px] xl:w-[540px] flex-shrink-0 sticky top-6">
          <LivePreviewPanel
            templateId={selectedTemplate}
            defaults={defaults}
            signatureUrl={signatureUrl}
          />
        </div>

      </div>
    </div>
  );
}
