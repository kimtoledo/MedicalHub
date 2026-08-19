"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LocateFixed, Loader2, X } from "lucide-react";

const DEFAULT_RADIUS_KM = 25;

export default function NearMeButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = searchParams.has("latitude") && searchParams.has("longitude");

  function useMyLocation() {
    if (!navigator.geolocation) { setError("Your browser doesn't support location search."); return; }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const params = new URLSearchParams(searchParams.toString());
        params.set("latitude", position.coords.latitude.toFixed(6));
        params.set("longitude", position.coords.longitude.toFixed(6));
        params.set("maxDistanceKm", String(DEFAULT_RADIUS_KM));
        params.set("page", "1");
        router.push(`/clinics?${params.toString()}`);
      },
      () => { setLocating(false); setError("Couldn't get your location. Check your browser's location permission."); },
      { timeout: 10_000 },
    );
  }

  function clearLocation() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("latitude"); params.delete("longitude"); params.delete("maxDistanceKm");
    router.push(`/clinics?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      {active ? (
        <button type="button" onClick={clearLocation} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50">
          <X size={15} /> Clear location
        </button>
      ) : (
        <button type="button" onClick={useMyLocation} disabled={locating} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60">
          {locating ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />} {locating ? "Locating…" : "Near me"}
        </button>
      )}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
