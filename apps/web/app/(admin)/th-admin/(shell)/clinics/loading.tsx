export default function ClinicsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-14 w-72 rounded-2xl bg-slate-200" />
        <div className="h-20 rounded-2xl bg-white shadow-sm" />
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="h-12 bg-slate-100" />
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-[68px] border-t border-slate-100 p-5">
              <div className="h-7 rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
