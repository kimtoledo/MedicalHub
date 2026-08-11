"use client";
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
export default function NewPatientDrawer({ clinicId }: { clinicId: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(
      Array.from(form.entries())
        .map(([key, value]) => [key, String(value).trim()])
        .filter(([, value]) => value),
    );
    try {
      const response = await fetch(
        `/api/clinic/patients?clinicId=${encodeURIComponent(clinicId)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as {
        data?: { id: string };
        error?: { message?: string };
      };
      if (!response.ok || !result.data)
        throw new Error(
          result.error?.message ?? "Patient could not be registered",
        );
      window.location.assign(`/app/patients/${result.data.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Patient could not be registered",
      );
      setSaving(false);
    }
  }
  const field =
    "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
      >
        <Plus size={17} />
        New Patient
      </button>
      {open && (
        <>
          <button
            aria-label="Close patient registration"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-patient-title"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                  Registration
                </p>
                <h2
                  id="new-patient-title"
                  className="mt-1 text-2xl font-bold text-slate-900"
                >
                  New patient
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X />
              </button>
            </div>
            <form onSubmit={submit} className="mt-7 space-y-7">
              <fieldset>
                <legend className="font-bold text-slate-900">
                  Demographics
                </legend>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    First name
                    <input
                      required
                      name="firstName"
                      maxLength={100}
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Last name
                    <input
                      required
                      name="lastName"
                      maxLength={100}
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Middle name
                    <input
                      name="middleName"
                      maxLength={100}
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Date of birth
                    <input name="dateOfBirth" type="date" className={field} />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Sex
                    <select name="sex" className={field}>
                      <option value="">Not specified</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Civil status
                    <select name="civilStatus" className={field}>
                      <option value="">Not specified</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="widowed">Widowed</option>
                      <option value="separated">Separated</option>
                    </select>
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend className="font-bold text-slate-900">Contact</legend>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Mobile number
                    <input
                      name="phone"
                      type="tel"
                      maxLength={20}
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Email
                    <input
                      name="email"
                      type="email"
                      maxLength={255}
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    Address
                    <textarea name="address" rows={2} className={field} />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    City
                    <input name="city" maxLength={100} className={field} />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Province
                    <input name="province" maxLength={100} className={field} />
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend className="font-bold text-slate-900">
                  Emergency contact / guardian
                </legend>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Emergency contact
                    <input
                      name="emergencyContactName"
                      maxLength={200}
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Emergency phone
                    <input
                      name="emergencyContactPhone"
                      maxLength={20}
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Relationship
                    <input
                      name="emergencyContactRelation"
                      maxLength={100}
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Guardian (for minors)
                    <input
                      name="guardianName"
                      maxLength={200}
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Guardian phone
                    <input
                      name="guardianPhone"
                      maxLength={20}
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Guardian relationship
                    <input
                      name="guardianRelation"
                      maxLength={100}
                      className={field}
                    />
                  </label>
                </div>
              </fieldset>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}
              <button
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                Register patient
              </button>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
