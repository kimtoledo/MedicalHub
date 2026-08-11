"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, ImageIcon } from "lucide-react";
import FilesTab from "@/components/app/FilesTab";
import type { PatientDetail } from "./page";

type Tab = "profile" | "files";

export default function PatientDetailClient({
  patient,
  clinicId,
  branchId,
}: {
  patient: PatientDetail;
  clinicId: string;
  branchId: string;
}) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/app/patients"
          className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 mb-2"
        >
          <ArrowLeft size={15} /> All Patients
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <User size={22} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-violet-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-violet-500 text-sm mt-0.5">
              {patient.patientNumber}
              {patient.dateOfBirth ? ` · Born ${patient.dateOfBirth}` : ""}
              {patient.sex ? ` · ${patient.sex}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-violet-50 p-1 rounded-xl w-fit">
        {(["profile", "files"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white text-violet-900 shadow-sm"
                : "text-violet-500 hover:text-violet-700"
            }`}
          >
            {t === "profile" ? <User size={14} /> : <ImageIcon size={14} />}
            {t === "profile" ? "Profile" : "Files"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "profile" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: "Phone", value: patient.phone },
              { label: "Email", value: patient.email },
              { label: "Address", value: [patient.address, patient.city].filter(Boolean).join(", ") || null },
            ]
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">{f.label}</p>
                  <p className="text-sm text-violet-800 mt-0.5">{f.value}</p>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <FilesTab
          clinicId={clinicId}
          patientId={patient.id}
          branchId={branchId}
          allowUpload={!!branchId}
        />
      )}
    </div>
  );
}
