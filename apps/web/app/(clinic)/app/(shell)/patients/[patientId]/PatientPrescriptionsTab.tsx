"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Loader2 } from "lucide-react";

type PatientPrescription = {
  id: string;
  encounterId: string | null;
  patientId: string;
  dentistFirstName: string | null;
  dentistLastName: string | null;
  prcLicenseNumber: string | null;
  issuedAt: string | null;
  createdAt: string;
  amendedFromId: string | null;
  itemCount: number;
};

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default function PatientPrescriptionsTab({
  clinicId,
  patientId,
}: {
  clinicId: string;
  patientId: string;
}) {
  const [items, setItems] = useState<PatientPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ patientId, page: "1", pageSize: "100" });

    void fetch(`/api/clinic/${clinicId}/prescriptions?${query}`, {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success: boolean;
          data?: PatientPrescription[];
          error?: { message?: string };
        };
        if (!response.ok || !payload.success) {
          throw new Error(payload.error?.message ?? "Prescriptions are unavailable");
        }
        setItems(payload.data ?? []);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Prescriptions are unavailable");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [clinicId, patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-violet-400">
        <Loader2 size={18} className="animate-spin" /> Loading prescriptions…
      </div>
    );
  }

  if (error) {
    return <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</div>;
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <FileText size={30} className="text-violet-200" />
        <p className="text-sm font-medium text-violet-500">No prescriptions issued yet</p>
        <p className="text-xs text-violet-400">Prescriptions issued from finalized encounters will appear here.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-violet-50">
      {items.map((item) => (
        <article key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <FileText size={16} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-900">
                {item.itemCount} medicine{item.itemCount === 1 ? "" : "s"}
                {item.amendedFromId ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                    Amendment
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-violet-500">
                {formatDate(item.issuedAt ?? item.createdAt)}
                {item.dentistFirstName
                  ? ` · Dr. ${item.dentistFirstName} ${item.dentistLastName ?? ""}`
                  : ""}
              </p>
              {item.prcLicenseNumber ? (
                <p className="text-xs text-violet-400">PRC {item.prcLicenseNumber}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3 pl-12 sm:pl-0">
            {item.encounterId ? (
              <Link
                href={`/app/encounters/${item.encounterId}`}
                className="text-xs font-semibold text-violet-500 hover:text-violet-700"
              >
                Encounter
              </Link>
            ) : null}
            <Link
              href={`/app/prescriptions/${item.id}`}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              View / Print
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
