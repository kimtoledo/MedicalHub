"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Edit3,
  Loader2,
  Download,
  Share2,
  Mail,
  MessageCircle,
  X,
  Settings,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { PrescriptionDetail } from "./page";
import RxTemplateClassic from "@/components/prescriptions/RxTemplateClassic";
import RxTemplateModern from "@/components/prescriptions/RxTemplateModern";
import RxTemplateMinimal from "@/components/prescriptions/RxTemplateMinimal";

// ---------------------------------------------------------------------------
// Template picker
// ---------------------------------------------------------------------------

function RxTemplate({ prescription }: { prescription: PrescriptionDetail }) {
  const clinic = prescription.clinic;
  const clinicName = prescription.clinicNameSnapshot ?? clinic.name;
  const clinicAddress =
    prescription.clinicAddressSnapshot ??
    [clinic.address, clinic.city].filter(Boolean).join(", ") ??
    null;
  const clinicPhone = clinic.phone ?? null;
  const clinicLogoUrl = prescription.clinicLogoUrl ?? clinic.logoUrl ?? null;
  const patientName =
    prescription.patientNameSnapshot ??
    `${prescription.patient.firstName} ${prescription.patient.lastName}`;
  const dentistName =
    prescription.dentistNameSnapshot ??
    (prescription.dentist
      ? `${prescription.dentist.firstName} ${prescription.dentist.lastName}`
      : "Unknown Dentist");

  const props = {
    clinicName,
    clinicAddress,
    clinicPhone,
    clinicLogoUrl,
    patientName,
    patientNumber: prescription.patient.patientNumber,
    dentistName,
    prcLicenseNumber:
      prescription.prcLicenseNumber ?? prescription.dentist?.licenseNumber ?? null,
    signatureUrl: prescription.signatureUrl ?? null,
    issuedAt: prescription.issuedAt,
    notes: prescription.notes,
    items: prescription.items,
    amendedFromId: prescription.amendedFromId,
  };

  if (prescription.templateId === "modern") return <RxTemplateModern {...props} />;
  if (prescription.templateId === "minimal") return <RxTemplateMinimal {...props} />;
  return <RxTemplateClassic {...props} />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PrescriptionDetailClient({
  prescription,
  clinicId,
}: {
  prescription: PrescriptionDetail;
  clinicId: string;
}) {
  const router = useRouter();
  const [amending, setAmending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareStatus, setShareStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const shareEmailRef = useRef<HTMLInputElement>(null);

  async function handleAmend() {
    setAmending(true);
    router.push(`/app/prescriptions/${prescription.id}/amend`);
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const element = document.getElementById("rx-document");
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const isMinimal = prescription.templateId === "minimal";
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: isMinimal ? "a5" : "a4",
      });

      // Paginate: slice the canvas image across as many pages as needed
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      // Scale factor: canvas pixels → mm
      const pixelsPerMm = canvas.width / pdfW;
      // How many canvas pixels fit on one PDF page
      const canvasPageHeight = pdfH * pixelsPerMm;
      // Total number of pages required
      const totalPages = Math.ceil(canvas.height / canvasPageHeight);
      // Full image height expressed in mm
      const fullImgHeightMm = canvas.height / pixelsPerMm;

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        // Shift the image upward by one page-height per additional page
        pdf.addImage(imgData, "PNG", 0, -(page * pdfH), pdfW, fullImgHeightMm);
      }

      pdf.save(`RX-${prescription.id.slice(0, 8).toUpperCase()}.pdf`);
    } catch {
      // silently fail — user can still print
    } finally {
      setDownloading(false);
    }
  }

  async function handleShareEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    setShareStatus("sending");
    try {
      const res = await fetch(
        `/api/clinic/${clinicId}/prescriptions/${prescription.id}/share-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientEmail: shareEmail.trim() }),
        }
      );
      if (res.ok) {
        setShareStatus("sent");
      } else {
        const json = await res.json().catch(() => ({})) as { error?: { message?: string } };
        console.error("Share failed:", json.error?.message);
        setShareStatus("error");
      }
    } catch {
      setShareStatus("error");
    }
  }

  function handleShareMessenger() {
    const link = encodeURIComponent(window.location.href);
    window.open(`https://www.messenger.com/share?link=${link}`, "_blank", "noopener");
  }

  return (
    <>
      {/* ── Action bar (hidden when printing) ── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto print:hidden space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/app/prescriptions"
            className="flex items-center gap-2 text-sm text-violet-500 hover:text-violet-700"
          >
            <ArrowLeft size={15} /> Back to Prescriptions
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Template / Signature settings */}
            <Link
              href="/app/settings/prescription-template"
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm rounded-xl transition-colors"
              title="Prescription template & signature settings"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Template</span>
            </Link>

            {/* Amend */}
            <button
              onClick={handleAmend}
              disabled={amending}
              className="inline-flex items-center gap-2 px-4 py-2 border border-violet-300 text-violet-600 hover:bg-violet-50 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {amending ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
              Amend
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? "Generating…" : "PDF"}
            </button>

            {/* Print */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Printer size={14} /> Print
            </button>

            {/* Share */}
            <div className="relative">
              <button
                onClick={() => { setShareOpen((o) => !o); setShareStatus("idle"); setShareEmail(""); }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl transition-colors"
              >
                <Share2 size={14} />
                Share
              </button>

              {shareOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <p className="font-semibold text-slate-800 text-sm">Share Prescription</p>
                    <button
                      onClick={() => setShareOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Email share */}
                  <form onSubmit={handleShareEmail} className="px-4 pb-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                      <Mail size={12} /> Email to Patient
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={shareEmailRef}
                        type="email"
                        value={shareEmail}
                        onChange={(e) => { setShareEmail(e.target.value); setShareStatus("idle"); }}
                        placeholder="patient@email.com"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        disabled={shareStatus === "sending" || shareStatus === "sent"}
                        required
                      />
                      <button
                        type="submit"
                        disabled={shareStatus === "sending" || shareStatus === "sent"}
                        className="px-3 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors"
                      >
                        {shareStatus === "sending" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : shareStatus === "sent" ? (
                          <CheckCircle size={14} />
                        ) : (
                          "Send"
                        )}
                      </button>
                    </div>
                    {shareStatus === "sent" && (
                      <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle size={12} /> Email queued for delivery
                      </p>
                    )}
                    {shareStatus === "error" && (
                      <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <AlertCircle size={12} /> Failed — check clinic email provider settings
                      </p>
                    )}
                  </form>

                  <div className="border-t border-slate-100 mx-4" />

                  {/* Messenger share */}
                  <div className="px-4 py-3">
                    <button
                      onClick={handleShareMessenger}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <MessageCircle size={16} className="text-blue-500" />
                      Share via Messenger
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {prescription.amendedFromId && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2.5 rounded-xl">
            ⚠️ This is an <strong>amended</strong> prescription. The original has been superseded.
          </div>
        )}
      </div>

      {/* ── Prescription document ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 print:p-0 print:max-w-none">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:border-0 print:shadow-none print:rounded-none">
          <RxTemplate prescription={prescription} />
        </div>
      </div>
    </>
  );
}
