import { cookies } from "next/headers";
import { AlertCircle } from "lucide-react";
import { getBackendUrl } from "@/lib/backend";
import ProfileClient, { type AccountProfile } from "./ProfileClient";

export default async function StaffProfilePage() {
  let profile: AccountProfile | null = null;
  try {
    const response = await fetch(getBackendUrl("/v1/profile"), {
      headers: { cookie: cookies().toString() },
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { success: true; data: AccountProfile };
      profile = payload.data;
    }
  } catch {
    profile = null;
  }

  if (profile) return <ProfileClient initialProfile={profile} />;

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <AlertCircle className="mx-auto text-red-500" size={32} aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold text-slate-900">Profile unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">We could not load your account details. Confirm the API is running, then refresh this page.</p>
      </div>
    </main>
  );
}
