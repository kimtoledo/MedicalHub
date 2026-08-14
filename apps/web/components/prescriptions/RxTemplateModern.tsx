import type { RxTemplateProps } from "./RxTemplateProps";

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function RxTemplateModern({
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
      style={{ width: "210mm", minHeight: "297mm", boxSizing: "border-box" }}
    >
      {/* ── Violet header band ── */}
      <div
        className="flex items-center gap-4 px-8 py-6"
        style={{ background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)" }}
      >
        {clinicLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clinicLogoUrl}
            alt={clinicName}
            className="h-14 w-auto object-contain flex-shrink-0 rounded-lg bg-white/10 p-1"
          />
        ) : (
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            {clinicName.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white leading-tight">{clinicName}</h1>
          {clinicAddress && (
            <p className="text-violet-200 text-xs mt-0.5">{clinicAddress}</p>
          )}
          {clinicPhone && (
            <p className="text-violet-200 text-xs">{clinicPhone}</p>
          )}
        </div>
        <div className="text-right text-white">
          <p className="text-xs text-violet-200 uppercase tracking-widest">
            {amendedFromId ? "Amended Prescription" : "Prescription"}
          </p>
          <p className="text-sm font-semibold mt-0.5">{fmt(issuedAt)}</p>
        </div>
      </div>

      {/* ── Patient card ── */}
      <div className="mx-8 mt-5 mb-5 p-4 rounded-xl border border-violet-100 bg-violet-50 flex justify-between items-start">
        <div>
          <p className="text-xs text-violet-500 uppercase tracking-wide font-semibold">Patient</p>
          <p className="text-base font-bold text-slate-800">{patientName}</p>
          <p className="text-xs text-slate-400">#{patientNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-violet-500 uppercase tracking-wide font-semibold">Prescribed by</p>
          <p className="text-sm font-semibold text-slate-700">{dentistName}</p>
          {prcLicenseNumber && (
            <p className="text-xs text-slate-400">PRC {prcLicenseNumber}</p>
          )}
        </div>
      </div>

      {/* ── Rx body ── */}
      <div className="px-8">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-3xl font-bold"
            style={{ color: "#7c3aed", fontFamily: "Georgia, serif" }}
          >℞</span>
          <span className="text-sm text-slate-400 uppercase tracking-widest font-semibold">Medications</span>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-xl border border-violet-100 bg-white px-4 py-3"
            >
              <div className="flex items-baseline gap-2">
                <span
                  className="text-xs font-bold text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0"
                  style={{ background: "#7c3aed", fontSize: "10px" }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{item.medicineName}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {item.dosage && (
                      <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">
                        {item.dosage}
                      </span>
                    )}
                    {item.frequency && (
                      <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                        {item.frequency}
                      </span>
                    )}
                    {item.duration && (
                      <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                        {item.duration}
                      </span>
                    )}
                  </div>
                  {item.specialInstructions && (
                    <p className="text-xs text-slate-500 mt-1 italic">{item.specialInstructions}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Notes ── */}
        {notes && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700 mb-1">Notes / Instructions</p>
            <p className="text-sm text-amber-800 whitespace-pre-line">{notes}</p>
          </div>
        )}

        {/* ── Signature ── */}
        <div className="mt-8 flex justify-end">
          <div className="text-center">
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureUrl}
                alt="Signature"
                className="h-12 w-auto object-contain mx-auto mb-1"
              />
            ) : (
              <div
                className="border-b-2 border-violet-400 mb-1 mx-4 h-10"
              />
            )}
            <p className="text-sm font-bold text-slate-800">{dentistName}</p>
            {prcLicenseNumber && (
              <p className="text-xs text-slate-400">PRC Lic. No. {prcLicenseNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mx-8 mt-6 mb-8 pt-4 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-400">
          Valid for 7 days from the date of issuance · For refills, consult your dentist
        </p>
      </div>
    </div>
  );
}
