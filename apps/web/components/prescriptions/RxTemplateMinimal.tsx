import type { RxTemplateProps } from "./RxTemplateProps";

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RxTemplateMinimal({
  clinicName,
  clinicAddress,
  clinicPhone,
  clinicLogoUrl,
  patientName,
  patientNumber,
  dentistName,
  prcLicenseNumber,
  signatureUrl,
  issuedAt,
  notes,
  items,
  amendedFromId,
}: RxTemplateProps) {
  return (
    <div
      id="rx-document"
      className="bg-white font-sans text-slate-900"
      style={{ width: "148mm", minHeight: "210mm", padding: "10mm 12mm", boxSizing: "border-box" }}
    >
      {/* ── Header (compact single row) ── */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-300 mb-3">
        {clinicLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clinicLogoUrl}
            alt={clinicName}
            className="h-8 w-auto object-contain flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight truncate">{clinicName}</p>
          {(clinicAddress || clinicPhone) && (
            <p className="text-xs text-slate-500 truncate">
              {[clinicAddress, clinicPhone].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-semibold text-slate-700">{fmt(issuedAt)}</p>
          {amendedFromId && (
            <p className="text-xs text-amber-600 font-medium">Amended</p>
          )}
        </div>
      </div>

      {/* ── Patient + Dentist row ── */}
      <div className="flex justify-between text-xs mb-3">
        <div>
          <span className="text-slate-400">Pt: </span>
          <span className="font-semibold">{patientName}</span>
          <span className="text-slate-400 ml-1">#{patientNumber}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400">Dr: </span>
          <span className="font-semibold">{dentistName}</span>
        </div>
      </div>

      {/* ── Rx symbol ── */}
      <p className="text-2xl font-bold mb-2" style={{ fontFamily: "Georgia, serif" }}>℞</p>

      {/* ── Medication list (compact) ── */}
      <div className="space-y-2 mb-3">
        {items.map((item, idx) => (
          <div key={item.id} className="text-xs border-b border-slate-100 pb-1.5 last:border-0">
            <div className="flex gap-1.5 items-baseline">
              <span className="text-slate-400 w-4 flex-shrink-0">{idx + 1}.</span>
              <div>
                <span className="font-semibold text-sm text-slate-800">{item.medicineName}</span>
                {" "}
                {[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ")}
                {item.specialInstructions && (
                  <span className="block text-slate-500 italic">{item.specialInstructions}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Notes ── */}
      {notes && (
        <div className="text-xs text-slate-600 border-l-2 border-slate-300 pl-2 mb-4 whitespace-pre-line">
          {notes}
        </div>
      )}

      {/* ── Signature block ── */}
      <div className="mt-6 flex justify-end">
        <div className="text-center text-xs">
          {signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatureUrl}
              alt="Signature"
              className="h-8 w-auto object-contain mx-auto mb-0.5"
            />
          ) : (
            <div className="border-b border-slate-500 mb-0.5 mx-2 h-7" />
          )}
          <p className="font-semibold">{dentistName}</p>
          {prcLicenseNumber && (
            <p className="text-slate-400">PRC {prcLicenseNumber}</p>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-4 pt-2 border-t border-slate-200">
        <p className="text-[9px] text-slate-400 text-center">
          Valid 7 days from issuance · Consult dentist for refills
        </p>
      </div>
    </div>
  );
}
