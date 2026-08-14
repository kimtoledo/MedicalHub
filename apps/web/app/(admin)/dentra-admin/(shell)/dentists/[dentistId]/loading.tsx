export default function DentistDetailLoading() {
  return (
    <div className="animate-pulse p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-5 w-32 rounded-lg bg-slate-200" />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-6 w-56 rounded-lg bg-slate-200" />
                <div className="h-4 w-40 rounded-lg bg-slate-100" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-24 rounded-full bg-slate-200" />
              <div className="h-7 w-24 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="h-5 w-48 rounded-lg bg-slate-200" />
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="space-y-2">
                  <div className="h-3 w-24 rounded bg-slate-100" />
                  <div className="h-4 w-32 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-5 w-32 rounded-lg bg-slate-200" />
            <div className="mt-5 h-24 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
