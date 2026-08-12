import { Loader2, UserCircle } from "lucide-react";

export default function ProfileLoading() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-6xl items-center justify-center p-6" role="status" aria-label="Loading profile">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <UserCircle size={28} aria-hidden="true" />
          <Loader2 size={16} className="absolute -bottom-1 -right-1 animate-spin rounded-full bg-white text-violet-600" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium">Loading your profile…</p>
      </div>
    </main>
  );
}
