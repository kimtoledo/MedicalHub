import { Construction } from "lucide-react";

interface StubPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function StubPage({
  title,
  description = "This section is coming soon. It will be available in the next development milestone.",
  icon,
}: StubPageProps) {
  return (
    <div className="p-6 sm:p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-violet-900">{title}</h1>
        <p className="text-violet-500 text-sm mt-1">Super Admin Panel</p>
      </div>

      {/* Empty state card */}
      <div className="bg-white rounded-2xl border border-violet-100 p-12 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
          {icon ?? <Construction size={28} className="text-violet-500" />}
        </div>
        <h2 className="text-lg font-bold text-violet-900 mb-2">Coming soon</h2>
        <p className="text-violet-500 text-sm leading-relaxed">{description}</p>
        <div className="mt-6 inline-flex items-center gap-2 bg-violet-50 text-violet-600 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
          In development
        </div>
      </div>
    </div>
  );
}
