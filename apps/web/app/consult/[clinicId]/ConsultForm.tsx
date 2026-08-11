"use client";

/**
 * Patient-facing photo consult submission form.
 * No login required. Patient fills in name, email, complaint, and uploads
 * 1–5 photos. On success, a confirmation message is shown.
 */

import { useRef, useState } from "react";
import { Camera, Upload, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const MAX_PHOTOS = 5;
const MAX_SIZE_MB = 20;

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function ConsultForm({ clinicId }: { clinicId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [complaint, setComplaint] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const toAdd = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    const invalid = toAdd.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (invalid) { setErrorMsg(`"${invalid.name}" exceeds the 20 MB limit.`); return; }
    setErrorMsg(null);
    const newPhotos = [...photos, ...toAdd];
    setPhotos(newPhotos);
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setPreviews((p) => [...p, ...newPreviews]);
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(previews[i]);
    setPhotos((p) => p.filter((_, j) => j !== i));
    setPreviews((p) => p.filter((_, j) => j !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0) { setErrorMsg("Please attach at least one photo."); return; }
    setState("submitting");
    setErrorMsg(null);

    const form = new FormData();
    form.append("patientName",  name.trim());
    form.append("patientEmail", email.trim());
    if (phone.trim()) form.append("patientPhone", phone.trim());
    form.append("complaint", complaint.trim());
    photos.forEach((f) => form.append("photo", f));

    try {
      const res = await fetch(`/api/public/consult/${clinicId}`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        setState("success");
      } else {
        const body = await res.json() as { error?: { message: string } };
        setErrorMsg(body.error?.message ?? "Submission failed. Please try again.");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle size={36} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-violet-900">Request Submitted!</h1>
          <p className="text-violet-600 text-sm leading-relaxed">
            Your photo consultation request has been sent to the dentist. You will receive an email at{" "}
            <strong>{email}</strong> once your photos have been reviewed.
          </p>
          <p className="text-xs text-violet-400">
            Typical response time: 1–2 business days.
          </p>
          <p className="text-[10px] text-violet-300 pt-2">
            Powered by Dentra.ph
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto mb-3">
            <Camera size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-violet-900">Remote Dental Consult</h1>
          <p className="text-violet-500 text-sm mt-1">
            Share your concern and photos. Your dentist will review and respond within 1–2 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-6 space-y-5">
          {/* Personal details */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-violet-700 mb-1">Full Name *</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan dela Cruz"
                className="w-full px-4 py-2.5 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-violet-700 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-violet-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  className="w-full px-4 py-2.5 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>
          </div>

          {/* Complaint */}
          <div>
            <label className="block text-xs font-bold text-violet-700 mb-1">
              Describe your concern *
            </label>
            <textarea
              required
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              rows={4}
              minLength={10}
              placeholder="e.g. I have a throbbing pain on my lower left tooth that started 3 days ago. It gets worse when I drink cold water..."
              className="w-full px-4 py-2.5 rounded-xl border border-violet-200 text-sm text-violet-900 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
            <p className="text-[10px] text-violet-400 mt-1">
              Be as specific as possible — which tooth, how long, what makes it worse.
            </p>
          </div>

          {/* Photo upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-violet-700">
                Photos * <span className="font-normal text-violet-400">({photos.length}/{MAX_PHOTOS})</span>
              </label>
              <p className="text-[10px] text-violet-400">JPEG, PNG, WebP, HEIC · Max 20 MB each</p>
            </div>

            {/* Photo grid */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-violet-50 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={11} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < MAX_PHOTOS && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-violet-200 rounded-xl py-6 flex flex-col items-center gap-2 text-violet-400 hover:border-violet-400 hover:text-violet-600 transition-colors"
                >
                  <Upload size={20} />
                  <span className="text-xs font-semibold">
                    {photos.length === 0 ? "Tap to add photos" : "Add more photos"}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={state === "submitting"}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {state === "submitting" ? (
              <><Loader2 size={16} className="animate-spin" /> Submitting…</>
            ) : (
              "Send for Review"
            )}
          </button>

          <p className="text-[10px] text-violet-400 text-center">
            Your information is kept private and only shared with your dentist.
          </p>
        </form>
      </div>
    </div>
  );
}
