"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

export type AccountProfile = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
  };
  memberships: Array<{
    clinicId: string;
    clinicName: string;
    branchId: string | null;
    branchName: string | null;
    role: string;
  }>;
};

type Draft = {
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
};

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-500";

function toDraft(profile: AccountProfile): Draft {
  return {
    firstName: profile.user.firstName,
    lastName: profile.user.lastName,
    phone: profile.user.phone ?? "",
    avatarUrl: profile.user.avatarUrl ?? "",
  };
}

function roleLabel(role: string): string {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "U";
}

export default function ProfileClient({ initialProfile }: { initialProfile: AccountProfile }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initialProfile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const savedDraft = useMemo(() => toDraft(profile), [profile]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  function update(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
    setSuccess("");
    if (field === "avatarUrl") setAvatarFailed(false);
  }

  function reset() {
    setDraft(savedDraft);
    setError("");
    setSuccess("");
    setAvatarFailed(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: draft.firstName,
          lastName: draft.lastName,
          phone: draft.phone.trim() || null,
          avatarUrl: draft.avatarUrl.trim() || null,
        }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: AccountProfile;
        error?: { message?: string };
      };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "Your profile could not be saved.");
      }
      setProfile(payload.data);
      setDraft(toDraft(payload.data));
      setSuccess("Profile saved successfully.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const previewUrl = draft.avatarUrl.trim();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Account</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">My Profile</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Keep your personal contact details current and review where your Dentra account has access.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={submit} className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
          <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white p-5 sm:flex-row sm:items-center sm:p-7">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-violet-600 text-xl font-bold text-white shadow-sm" aria-label="Profile avatar">
              {previewUrl && !avatarFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Profile avatar preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} />
              ) : (
                initials(draft.firstName, draft.lastName)
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-slate-900">
                {`${draft.firstName} ${draft.lastName}`.trim() || "Your name"}
              </h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <Mail size={15} aria-hidden="true" />
                <span className="truncate">{profile.user.email}</span>
              </p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${profile.user.emailVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                <BadgeCheck size={13} aria-hidden="true" />
                {profile.user.emailVerified ? "Email verified" : "Email not verified"}
              </span>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Personal information</h2>
              <p className="mt-1 text-sm text-slate-500">These details identify you inside the clinic workspace.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                First name
                <input required maxLength={100} autoComplete="given-name" value={draft.firstName} onChange={(event) => update("firstName", event.target.value)} className={inputClass} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Last name
                <input required maxLength={100} autoComplete="family-name" value={draft.lastName} onChange={(event) => update("lastName", event.target.value)} className={inputClass} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Phone number
                <input type="tel" minLength={7} maxLength={20} autoComplete="tel" placeholder="e.g. +63 917 123 4567" value={draft.phone} onChange={(event) => update("phone", event.target.value)} className={inputClass} />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Email address
                <span className="relative block">
                  <input type="email" value={profile.user.email} disabled className={`${inputClass} pr-10`} />
                  <LockKeyhole size={16} className="absolute right-3 top-5 text-slate-400" aria-hidden="true" />
                </span>
                <span className="mt-1.5 block text-xs font-normal text-slate-500">Contact an administrator to change your sign-in email.</span>
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Avatar URL
                <input type="url" maxLength={500} autoComplete="url" placeholder="https://example.com/profile-photo.jpg" value={draft.avatarUrl} onChange={(event) => update("avatarUrl", event.target.value)} className={inputClass} />
                <span className="mt-1.5 block text-xs font-normal text-slate-500">Use a secure, publicly accessible image URL. File uploads are not enabled yet.</span>
              </label>
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</div>}
            {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-700"><CheckCircle2 size={17} aria-hidden="true" />{success}</div>}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={reset} disabled={!dirty || saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-50">
                <RotateCcw size={16} aria-hidden="true" /> Discard changes
              </button>
              <button disabled={!dirty || saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-violet-300">
                {saving ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Building2 size={20} aria-hidden="true" /></span>
              <div><h2 className="font-bold text-slate-900">Clinic access</h2><p className="text-xs text-slate-500">Managed by your clinic administrator</p></div>
            </div>
            <ul className="mt-5 space-y-3">
              {profile.memberships.map((membership) => (
                <li key={`${membership.clinicId}:${membership.branchId ?? "all"}:${membership.role}`} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{membership.clinicName}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-500"><MapPin size={13} aria-hidden="true" />{membership.branchName ?? "All branches"}</p>
                  <span className="mt-3 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">{roleLabel(membership.role)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck size={21} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div><h2 className="font-bold text-emerald-950">Protected account</h2><p className="mt-1 text-sm leading-6 text-emerald-800">Your email, clinic role, and branch access cannot be changed from this page.</p></div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
