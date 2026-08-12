export default function AdminDashboardLoading() {
  return <div className="space-y-6 p-4 sm:p-6 lg:p-8" role="status"><div className="h-16 w-72 animate-pulse rounded-xl bg-violet-100" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl bg-violet-100" />)}</div><div className="h-80 animate-pulse rounded-2xl bg-violet-100" /><span className="sr-only">Loading platform dashboard</span></div>;
}
