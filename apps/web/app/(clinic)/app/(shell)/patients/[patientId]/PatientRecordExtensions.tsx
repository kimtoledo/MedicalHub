"use client";

import { useState } from "react";
import { Activity, ClipboardList, FileText, ImageIcon, Shield } from "lucide-react";
import FilesTab from "@/components/app/FilesTab";
import AiImagingTab from "@/components/app/AiImagingTab";
import { HmoTab } from "./PatientDetailClient";
import PatientPrescriptionsTab from "./PatientPrescriptionsTab";
import TreatmentPlansTab from "@/components/app/TreatmentPlansTab";

type ExtensionTab = "treatmentPlans" | "prescriptions" | "files" | "aiImaging" | "hmo";

export default function PatientRecordExtensions({
  clinicId,
  patientId,
  branchId,
  canUsePrescriptions,
  canUseFiles,
  canUseAiImaging,
  canUseHmo,
  canUseTreatmentPlans,
  canManageTreatmentPlans,
}: {
  clinicId: string;
  patientId: string;
  branchId: string;
  canUsePrescriptions: boolean;
  canUseFiles: boolean;
  canUseAiImaging: boolean;
  canUseHmo: boolean;
  canUseTreatmentPlans: boolean;
  canManageTreatmentPlans: boolean;
}) {
  const initialTab: ExtensionTab = canUseTreatmentPlans
    ? "treatmentPlans"
    : canUsePrescriptions
    ? "prescriptions"
    : canUseFiles
      ? "files"
      : canUseAiImaging
        ? "aiImaging"
        : "hmo";
  const [tab, setTab] = useState<ExtensionTab>(initialTab);
  const tabs = [
    ...(canUseTreatmentPlans
      ? [{ id: "treatmentPlans" as const, label: "Treatment Plans", icon: ClipboardList }]
      : []),
    ...(canUsePrescriptions
      ? [{ id: "prescriptions" as const, label: "Prescriptions", icon: FileText }]
      : []),
    ...(canUseFiles
      ? [{ id: "files" as const, label: "Clinical Files", icon: ImageIcon }]
      : []),
    ...(canUseAiImaging
      ? [{ id: "aiImaging" as const, label: "AI Imaging", icon: Activity }]
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

        {tab === "treatmentPlans" && canUseTreatmentPlans ? (
          <TreatmentPlansTab clinicId={clinicId} patientId={patientId} canManage={canManageTreatmentPlans} />
        ) : tab === "prescriptions" && canUsePrescriptions ? (
          <PatientPrescriptionsTab clinicId={clinicId} patientId={patientId} />
        ) : tab === "files" && canUseFiles ? (
          <FilesTab
            clinicId={clinicId}
            patientId={patientId}
            branchId={branchId}
            allowUpload={Boolean(branchId)}
          />
        ) : tab === "aiImaging" && canUseAiImaging ? (
          <AiImagingTab clinicId={clinicId} patientId={patientId} canConfirm={canManageTreatmentPlans} />
        ) : canUseHmo ? (
          <HmoTab clinicId={clinicId} patientId={patientId} />
        ) : null}
      </div>
    </section>
  );
}
