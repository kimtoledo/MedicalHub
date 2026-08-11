"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import DentraLogo from "@/components/brand/DentraLogo";
import { revokeClinicSession } from "@/lib/clinic-auth-client";
import { type ClinicRole } from "@/lib/clinic-types";

type SessionContextPayload = {
  success?: boolean;
  data?: {
    strategies?: string[];
    clinicMemberships?: { role: string }[];
  };
};

async function getClinicRole(): Promise<ClinicRole | null> {
  const response = await fetch("/api/session-context", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as SessionContextPayload;
  const membership = payload.data?.clinicMemberships?.[0];

  if (!payload.success || !payload.data?.strategies?.includes("clinicMember") || !membership) {
    return null;
  }

  return membership.role === "dentist" ? "dentist" : "clinic_staff";
}

export default function ClinicLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void getClinicRole()
      .then((role) => {
        if (active && role) {
          router.replace(role === "dentist" ? "/app/dentist" : "/app");
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      const role = await getClinicRole();

      if (!role) {
        await revokeClinicSession();
        setError("This account does not have clinic access.");
        return;
      }

      router.replace(role === "dentist" ? "/app/dentist" : "/app");
      router.refresh();
    } catch {
      setError("Unable to reach the authentication service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-violet-900 to-violet-950 flex items-center justify-center px-4 py-12">
      {/* Bg decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-violet-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-violet-800/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <DentraLogo variant="white" className="h-20 w-auto mx-auto mb-2" />
          <p className="text-violet-400 text-sm mt-1 font-medium">Clinic Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-violet-950/50 p-8">
          <h2 className="text-xl font-bold text-violet-900 mb-1">Sign in</h2>
          <p className="text-violet-500 text-sm mb-6">Access your clinic workspace.</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-5 border border-red-100">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-violet-800 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="staff@clinic.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-violet-200 text-violet-900 text-sm placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-violet-800 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-violet-200 text-violet-900 text-sm placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 hover:text-violet-600 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <a href="/" className="text-violet-400 hover:text-violet-200 text-sm transition-colors">
            ← Back to Dentra.ph
          </a>
        </p>
      </div>
    </div>
  );
}
