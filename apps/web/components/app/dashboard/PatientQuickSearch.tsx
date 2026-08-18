"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Search, UserRound } from "lucide-react";

type PatientSearchResult = {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

export default function PatientQuickSearch({ clinicId }: { clinicId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches("input, textarea, select, [contenteditable='true']");
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const search = new URLSearchParams({
        clinicId,
        search: trimmedQuery,
        page: "1",
        pageSize: "6",
      });
      fetch(`/api/clinic/patients?${search}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok)
            throw new Error(payload.error?.message ?? "Patient search unavailable");
          return (payload.data?.items ?? []) as PatientSearchResult[];
        })
        .then(setResults)
        .catch((caught) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setResults([]);
          setError(
            caught instanceof Error ? caught.message : "Patient search unavailable",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [clinicId, trimmedQuery]);

  return (
    <div className="relative">
      <label className="relative block">
        <span className="sr-only">Find a clinic patient</span>
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
        />
        <input
          ref={inputRef}
          aria-keyshortcuts="/"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find patient by name, number, or mobile"
          className="h-12 w-full rounded-xl border border-violet-200 bg-white pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
        {loading ? (
          <Loader2
            aria-label="Searching patients"
            size={18}
            className="absolute right-3.5 top-3.5 animate-spin text-violet-600"
          />
        ) : (
          <kbd className="pointer-events-none absolute right-3.5 top-3 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-400">
            /
          </kbd>
        )}
      </label>

      {trimmedQuery.length >= 2 ? (
        <div className="absolute inset-x-0 top-14 z-20 overflow-hidden rounded-xl border border-violet-100 bg-white shadow-xl">
          {error ? (
            <p role="alert" className="p-4 text-sm text-red-700">
              {error}
            </p>
          ) : results.length ? (
            <ul className="divide-y divide-slate-100">
              {results.map((patient) => (
                <li key={patient.id}>
                  <Link
                    href={`/app/patients/${patient.id}`}
                    className="flex items-center gap-3 p-3.5 hover:bg-violet-50 focus:bg-violet-50 focus:outline-none"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <UserRound size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {patient.lastName}, {patient.firstName}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {patient.patientNumber}
                        {patient.phone ? ` · ${patient.phone}` : ""}
                      </span>
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-violet-500" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : loading ? null : (
            <p className="p-4 text-sm text-slate-500">
              No matching patient in this clinic.
            </p>
          )}
          <Link
            href={`/app/patients?search=${encodeURIComponent(trimmedQuery)}`}
            className="block border-t border-violet-100 bg-violet-50 px-4 py-3 text-center text-xs font-bold text-violet-700 hover:bg-violet-100"
          >
            Open full patient search
          </Link>
        </div>
      ) : null}
    </div>
  );
}
