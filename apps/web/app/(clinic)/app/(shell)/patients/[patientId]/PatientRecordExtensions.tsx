"use client";

import { useState } from "react";
import { FileText, ImageIcon, Shield } from "lucide-react";
import FilesTab from "@/components/app/FilesTab";
import { HmoTab } from "./PatientDetailClient";
import PatientPrescriptionsTab from "./PatientPrescriptionsTab";

type ExtensionTab = "prescriptions" | "files" | "hmo";

export default function PatientRecordExtensions({
  clinicId,
  patientId,
  branchId,
  canUsePrescriptions,
  canUseFiles,
  canUseHmo,
}: {
  clinicId: string;
  patientId: string;
  branchId: string;
  canUsePrescriptions: boolean;
  canUseFiles: boolean;
  canUseHmo: boolean;
}) {
  const initialTab: ExtensionTab = canUsePrescriptions
    ? "prescriptions"
    : canUseFiles
      ? "files"
      : "hmo";
  const [tab, setTab] = useState<ExtensionTab>(initialTab);
  const tabs = [
    ...(canUsePrescriptions
      ? [{ id: "prescriptions" as const, label: "Prescriptions", icon: FileText }]
      : []),
    ...(canUseFiles
      ? [{ id: "files" as const, label: "Clinical Files", icon: ImageIcon }]
      : []),
    ...(canUseHmo
      ? [{ id: "hmo" as const, label: "HMO Coverage", icon: Shield }]
      : []),
  ];

  if (tabs.length === 0) return null;

  return (
    <section className="px-4 pb-8 sm:px-8">
      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex w-fit gap-1 rounded-xl bg-violet-50 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                tab === id
                  ? "bg-white text-violet-900 shadow-sm"
                  : "text-violet-500 hover:text-violet-700"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {tab === "prescriptions" && canUsePrescriptions ? (
          <PatientPrescriptionsTab clinicId={clinicId} patientId={patientId} />
        ) : tab === "files" && canUseFiles ? (
          <FilesTab
            clinicId={clinicId}
            patientId={patientId}
            branchId={branchId}
            allowUpload={Boolean(branchId)}
          />
        ) : canUseHmo ? (
          <HmoTab clinicId={clinicId} patientId={patientId} />
        ) : null}
      </div>
    </section>
  );
}
