import { Construction } from "lucide-react";

interface AppStubPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function AppStubPage({
  title,
  description = "This section is coming soon. It will be available in the next development milestone.",
  icon,
}: AppStubPageProps) {
  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-violet-900">{title}</h1>
        <p className="text-violet-500 text-sm mt-1">Clinic Portal</p>
      </div>
      <div className="bg-white rounded-2xl border border-violet-100 p-12 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
          {icon ?? <Construction size={28} className="text-violet-500" />}
        </div>
        <h2 className="text-lg font-bold text-violet-900 mb-2">Coming soon</h2>
        <p className="text-violet-500 text-sm leading-relaxed">{description}</p>
        <div className="mt-6 inline-flex items-center gap-2 bg-violet-50 text-violet-600 text-xs font-semibold px-3 py-2 rounded-full">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
          In development
        </div>
      </div>
    </div>
  );
}
