import type { RxTemplateProps } from "./RxTemplateProps";

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function pill(label: string, value: string | null) {
  if (!value) return null;
  return (
    <span className="inline-block mr-3 text-xs text-slate-600">
      <span className="font-medium text-slate-400">{label}:&nbsp;</span>{value}
    </span>
  );
}

export default function RxTemplateClassic({
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
      className="bg-white font-serif text-slate-900"
      style={{ width: "210mm", minHeight: "297mm", padding: "16mm 18mm", boxSizing: "border-box" }}
    >
      {/* ── Clinic header ── */}
      <div className="flex items-start gap-4 pb-4 border-b-2 border-slate-800">
        {clinicLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clinicLogoUrl}
            alt={clinicName}
            className="h-16 w-auto object-contain flex-shrink-0"
          />
        )}
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold tracking-wide uppercase">{clinicName}</h1>
          {clinicAddress && (
            <p className="text-sm text-slate-600 mt-0.5">{clinicAddress}</p>
          )}
          {clinicPhone && (
            <p className="text-sm text-slate-600">{clinicPhone}</p>
          )}
        </div>
      </div>

      {/* ── Title ── */}
      <div className="text-center my-4">
        <span className="text-lg font-bold tracking-widest uppercase border-b-2 border-slate-800 pb-1">
          {amendedFromId ? "AMENDED PRESCRIPTION" : "PRESCRIPTION"}
        </span>
      </div>

      {/* ── Patient / Date row ── */}
      <div className="flex justify-between items-baseline mb-4 text-sm">
        <div>
          <span className="text-slate-500">Patient:&nbsp;</span>
          <span className="font-semibold">{patientName}</span>
          <span className="ml-2 text-xs text-slate-400">#{patientNumber}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-500">Date:&nbsp;</span>
          <span className="font-semibold">{fmt(issuedAt)}</span>
        </div>
      </div>

      {/* ── Rx symbol + items ── */}
      <div className="mb-6">
        <div className="text-4xl font-bold text-slate-800 mb-3" style={{ fontFamily: "Georgia, serif" }}>℞</div>
        <ol className="space-y-4 ml-2">
          {items.map((item, idx) => (
            <li key={item.id} className="border-b border-slate-200 pb-3 last:border-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400 font-mono w-5 flex-shrink-0">{idx + 1}.</span>
                <div>
                  <p className="font-bold text-base">{item.medicineName}</p>
                  <div className="mt-0.5">
                    {pill("Sig", item.dosage)}
                    {pill("Freq", item.frequency)}
                    {pill("Dur", item.duration)}
                  </div>
                  {item.specialInstructions && (
                    <p className="text-xs text-slate-500 mt-1 italic">{item.specialInstructions}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Notes ── */}
      {notes && (
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded p-3 text-sm">
          <p className="font-semibold text-slate-700 mb-1">Notes / Instructions</p>
          <p className="text-slate-600 whitespace-pre-line">{notes}</p>
        </div>
      )}

      {/* ── Signature block ── */}
      <div className="mt-8 flex justify-end">
        <div className="text-center min-w-[160px]">
          {signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatureUrl}
              alt="Signature"
              className="h-14 w-auto object-contain mx-auto mb-1"
            />
          ) : (
            <div className="border-b border-slate-600 mb-1 mx-4 h-10" />
          )}
          <p className="text-sm font-bold">{dentistName}</p>
          {prcLicenseNumber && (
            <p className="text-xs text-slate-500">PRC Lic. No. {prcLicenseNumber}</p>
          )}
          <p className="text-xs text-slate-500 mt-0.5">Prescribing Dentist</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-8 pt-3 border-t border-slate-300 text-center">
        <p className="text-xs text-slate-400">
          This prescription is valid for 7 days from the date of issuance. For refills, consult your dentist.
        </p>
      </div>
    </div>
  );
}
