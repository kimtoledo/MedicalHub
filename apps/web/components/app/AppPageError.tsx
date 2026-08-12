"use client";

import { AlertCircle, LockKeyhole, RefreshCw } from "lucide-react";

export default function AppPageError({
  title,
  message,
  kind = "service",
}: {
  title: string;
  message: string;
  kind?: "forbidden" | "not-found" | "service";
}) {
  const forbidden = kind === "forbidden";
  const Icon = forbidden ? LockKeyhole : AlertCircle;

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div
        role="alert"
        className={`mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${
          forbidden ? "border-amber-200" : "border-red-200"
        }`}
      >
        <Icon
          size={30}
          className={forbidden ? "text-amber-600" : "text-red-500"}
          aria-hidden="true"
        />
        <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        {kind === "service" && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <RefreshCw size={15} aria-hidden="true" /> Retry
          </button>
        )}
      </div>
    </main>
  );
}
