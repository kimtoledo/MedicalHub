"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, User, Clock, ChevronRight, Edit3 } from "lucide-react";

type RxListItem = {
  id: string;
  encounterId: string | null;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientNumber: string;
  dentistFirstName: string | null;
  dentistLastName: string | null;
  prcLicenseNumber: string | null;
  issuedAt: string | null;
  createdAt: string;
  amendedFromId: string | null;
  itemCount: number;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export default function PrescriptionsListClient({ clinicId }: { clinicId: string }) {
  const [items, setItems] = useState<RxListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/clinic/${clinicId}/prescriptions?page=${page}&pageSize=${PAGE_SIZE}`,
      { credentials: "include", cache: "no-store" }
    )
      .then((r) => r.json())
      .then((data: { success: boolean; data: RxListItem[]; total: number }) => {
        if (data.success) {
          setItems(data.data);
          setTotal(data.total);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [clinicId, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-900">Prescriptions</h1>
          <p className="text-violet-500 text-sm mt-0.5">e-Rx issued across all encounters</p>
        </div>
        <Link
          href="/app/prescriptions/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} /> New Prescription
        </Link>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText size={36} className="text-violet-200" />
            <p className="text-violet-400 text-sm font-medium">No prescriptions yet</p>
            <Link
              href="/app/prescriptions/new"
              className="text-violet-600 hover:text-violet-800 text-sm font-semibold underline"
            >
              Issue the first prescription
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-violet-50">
            {items.map((rx) => (
              <li key={rx.id}>
                <Link
                  href={`/app/prescriptions/${rx.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-violet-50/60 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-violet-900 text-sm">
                        {rx.patientFirstName} {rx.patientLastName}
                      </span>
                      <span className="text-xs text-violet-400 font-medium bg-violet-50 px-1.5 py-0.5 rounded">
                        {rx.patientNumber}
                      </span>
                      {rx.amendedFromId && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-semibold">
                          <Edit3 size={9} /> Amendment
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-violet-400 flex-wrap">
                      {(rx.dentistFirstName || rx.dentistLastName) && (
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          Dr. {rx.dentistFirstName} {rx.dentistLastName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDate(rx.issuedAt)}
                      </span>
                      <span>{rx.itemCount} medicine{rx.itemCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-violet-300 group-hover:text-violet-500 flex-shrink-0 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-violet-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
