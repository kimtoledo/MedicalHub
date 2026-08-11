"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Edit3, Loader2 } from "lucide-react";
import type { PrescriptionDetail } from "./page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

  const clinic = prescription.clinic;
  const clinicName = prescription.clinicNameSnapshot ?? clinic.name;
  const clinicAddress = prescription.clinicAddressSnapshot
    ?? [clinic.address, clinic.city].filter(Boolean).join(", ")
    ?? null;

  async function handleAmend() {
    // Navigate to new prescription form with prefilled data from this prescription.
    // The amend POST will be triggered from a separate amend confirmation page.
    // For MVP simplicity, redirect to a pre-filled amend URL.
    setAmending(true);
    router.push(`/app/prescriptions/${prescription.id}/amend`);
  }

  return (
    <>
      {/* Action bar (hidden during print) */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto print:hidden space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/app/prescriptions"
            className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700"
          >
            <ArrowLeft size={15} /> Back to Prescriptions
          </Link>
          <div className="flex gap-2">
            <button
              onClick={handleAmend}
              disabled={amending}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-violet-300 text-violet-600 hover:bg-violet-50 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {amending ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
              Amend
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Printer size={14} /> Print / PDF
            </button>
          </div>
        </div>

        {prescription.amendedFromId && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2.5 rounded-xl">
            This prescription is an amendment of{" "}
            <Link
              href={`/app/prescriptions/${prescription.amendedFromId}`}
              className="font-semibold underline"
            >
              the original prescription
            </Link>
            .
          </div>
        )}
      </div>

      {/* Printable prescription */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 print:px-0 print:pb-0">
        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden print:shadow-none print:border print:border-gray-300 print:rounded-none">

          {/* ── Clinic Header ─────────────────────────────────────────── */}
          <div className="bg-violet-900 text-white px-8 py-6 print:bg-white print:text-violet-900 print:border-b print:border-gray-300">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {clinic.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={clinic.logoUrl}
                    alt={clinicName}
                    className="w-14 h-14 rounded-xl object-contain bg-white/10 p-1 flex-shrink-0 print:bg-transparent"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-violet-700 print:bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-white print:text-violet-900 text-2xl font-bold leading-none select-none">
                      {clinicName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{clinicName}</h2>
                  {clinicAddress && (
                    <p className="text-violet-300 print:text-violet-500 text-xs mt-0.5">{clinicAddress}</p>
                  )}
                  {clinic.phone && (
                    <p className="text-violet-300 print:text-violet-500 text-xs">{clinic.phone}</p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold uppercase tracking-widest text-violet-300 print:text-violet-500">
                  Official Prescription
                </p>
                <p className="font-mono text-sm font-bold text-white print:text-violet-900 mt-1">
                  {formatDate(prescription.issuedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Patient & Dentist ──────────────────────────────────────── */}
          <div className="px-8 py-5 border-b border-violet-50 print:border-gray-200">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">
                  Patient
                </p>
                <p className="font-semibold text-violet-900">
                  {prescription.patientNameSnapshot ??
                    `${prescription.patient.firstName} ${prescription.patient.lastName}`}
                </p>
                <p className="text-xs text-violet-400 mt-0.5">{prescription.patient.patientNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">
                  Prescribing Dentist
                </p>
                <p className="font-semibold text-violet-900">
                  {prescription.dentistNameSnapshot
                    ? `Dr. ${prescription.dentistNameSnapshot}`
                    : prescription.dentist
                    ? `Dr. ${prescription.dentist.firstName} ${prescription.dentist.lastName}`
                    : "—"}
                </p>
                {prescription.prcLicenseNumber && (
                  <p className="text-xs text-violet-400 mt-0.5">
                    PRC License: {prescription.prcLicenseNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Medicines ─────────────────────────────────────────────── */}
          <div className="px-8 py-5">
            <div className="flex items-center gap-2 mb-4">
              {/* Rx symbol */}
              <span className="text-2xl font-serif font-bold text-violet-900 leading-none">℞</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                Prescription
              </span>
            </div>

            <ol className="space-y-4">
              {prescription.items.map((item, idx) => (
                <li key={item.id} className="flex gap-4">
                  <span className="text-violet-300 font-bold text-sm w-5 flex-shrink-0 pt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-violet-900">{item.medicineName}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-violet-600">
                      {item.dosage && <span><span className="text-violet-400 text-xs">Dose:</span> {item.dosage}</span>}
                      {item.frequency && <span><span className="text-violet-400 text-xs">Freq:</span> {item.frequency}</span>}
                      {item.duration && <span><span className="text-violet-400 text-xs">Duration:</span> {item.duration}</span>}
                    </div>
                    {item.specialInstructions && (
                      <p className="text-xs text-violet-500 italic mt-1">Sig: {item.specialInstructions}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {prescription.notes && (
              <div className="mt-6 pt-4 border-t border-violet-50 print:border-gray-200">
                <p className="text-xs text-violet-400 font-semibold uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-violet-700">{prescription.notes}</p>
              </div>
            )}
          </div>

          {/* ── Signature block ────────────────────────────────────────── */}
          <div className="px-8 py-6 border-t border-violet-50 print:border-gray-200">
            <div className="flex justify-end">
              <div className="text-center min-w-[200px]">
                <div className="h-12 border-b border-violet-300 print:border-gray-400 mb-2" />
                <p className="text-sm font-semibold text-violet-900">
                  {prescription.dentistNameSnapshot ??
                    (prescription.dentist
                      ? `Dr. ${prescription.dentist.firstName} ${prescription.dentist.lastName}`
                      : "Prescribing Dentist")}
                </p>
                {prescription.prcLicenseNumber && (
                  <p className="text-xs text-violet-500 mt-0.5">
                    PRC Lic. {prescription.prcLicenseNumber}
                  </p>
                )}
                <p className="text-[10px] text-violet-400 mt-1 uppercase tracking-wide">
                  Signature over Printed Name
                </p>
              </div>
            </div>
          </div>

          {/* ── Immutability notice (screen only) ─────────────────────── */}
          <div className="bg-violet-50 px-8 py-3 print:hidden">
            <p className="text-xs text-violet-400 text-center">
              This prescription is immutable once issued. Use <strong>Amend</strong> to create a corrected copy.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
