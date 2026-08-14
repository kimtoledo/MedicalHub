'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, UsersRound } from 'lucide-react';

type ClinicPatient = {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
};

type ClinicPatientsResult = {
  items: ClinicPatient[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(value));
}

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

export default function ClinicPatientsTab({ clinicId }: { clinicId: string }) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ClinicPatientsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce the search box, and reset to page 1 whenever the search term changes.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) query.set('search', search);
    void fetch(`/api/admin/clinics/${clinicId}/patients?${query}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { success: boolean; data?: ClinicPatientsResult; error?: { message?: string } };
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error?.message ?? 'Patients are unavailable');
        }
        setResult(payload.data);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : 'Patients are unavailable');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [clinicId, page, search]);

  return (
    <div>
      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or patient number…"
          className="w-full max-w-sm rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      {loading && !result ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Loading patients…
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      ) : !result || result.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <UsersRound size={30} className="text-slate-200" />
          <p className="text-sm font-medium text-slate-500">
            {search ? `No patients matching "${search}"` : 'No patients registered at this clinic yet'}
          </p>
        </div>
      ) : (
        <div>
          <div className="divide-y divide-slate-100">
            {result.items.map((patient) => (
              <div key={patient.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{patient.firstName} {patient.lastName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {patient.patientNumber} · {patient.phone ?? patient.email ?? 'No contact on file'}
                  </p>
                </div>
                <p className="text-xs text-slate-500">Registered {formatDate(patient.createdAt)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
            <span>
              Page {result.pagination.page} of {result.pagination.totalPages} · {result.pagination.total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={result.pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(result.pagination.totalPages, current + 1))}
                disabled={result.pagination.page >= result.pagination.totalPages || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
