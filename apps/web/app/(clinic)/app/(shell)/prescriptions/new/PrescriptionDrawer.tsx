"use client";

import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import NewPrescriptionClient from "./NewPrescriptionClient";

export default function PrescriptionDrawer({
  clinicId,
  encounterId,
}: {
  clinicId: string;
  encounterId: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        <FileText size={16} />
        Issue Prescription
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="New prescription">
          <button
            type="button"
            aria-label="Close prescription form"
            className="absolute inset-0 bg-violet-950/40 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-3xl overflow-y-auto bg-violet-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex justify-end border-b border-violet-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                autoFocus
                className="rounded-lg p-2 text-violet-500 hover:bg-violet-50 hover:text-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                aria-label="Close prescription form"
              >
                <X size={19} />
              </button>
            </div>
            <NewPrescriptionClient clinicId={clinicId} initialEncounterId={encounterId} embedded />
          </div>
        </div>
      ) : null}
    </>
  );
}
