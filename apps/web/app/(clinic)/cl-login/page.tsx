"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Stethoscope, Users, AlertCircle } from "lucide-react";
import { type ClinicRole } from "@/components/app/ClinicAuthGuard";

export default function ClinicLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<ClinicRole>("clinic_staff");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 1000));

    if (email === "wrong@example.com" || password === "wrong") {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }
    if (!email || !password) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    localStorage.setItem(
      "th_clinic_session",
      JSON.stringify({ email, role, ts: Date.now() })
    );
    router.push(role === "dentist" ? "/app/dentist" : "/app");
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
          <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-600 rounded-2xl shadow-xl shadow-violet-900/50 mb-4">
            <span className="text-white font-extrabold text-xl">TH</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ToothHub PH</h1>
          <p className="text-violet-400 text-sm mt-1 font-medium">Clinic Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-violet-950/50 p-8">
          <h2 className="text-xl font-bold text-violet-900 mb-1">Sign in</h2>
          <p className="text-violet-500 text-sm mb-6">Access your clinic workspace.</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setRole("clinic_staff")}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                role === "clinic_staff"
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-violet-100 text-violet-400 hover:border-violet-200"
              }`}
            >
              <Users size={16} className="flex-shrink-0" />
              <span>Clinic Staff</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("dentist")}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                role === "dentist"
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-violet-100 text-violet-400 hover:border-violet-200"
              }`}
            >
              <Stethoscope size={16} className="flex-shrink-0" />
              <span>I&apos;m a Dentist</span>
            </button>
          </div>

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
                placeholder={role === "dentist" ? "dr.santos@clinic.ph" : "staff@clinic.ph"}
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
              className={`w-full font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm text-white ${
                role === "dentist"
                  ? "bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400"
                  : "bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                `Sign in as ${role === "dentist" ? "Dentist" : "Clinic Staff"}`
              )}
            </button>
          </form>

          <p className="text-center text-xs text-violet-300 mt-6">
            Demo: any valid email + any password will sign you in.
          </p>
        </div>

        <p className="text-center mt-6">
          <a href="/" className="text-violet-400 hover:text-violet-200 text-sm transition-colors">
            ← Back to ToothHub PH
          </a>
        </p>
      </div>
    </div>
  );
}
