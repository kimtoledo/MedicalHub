import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 sm:px-6 pt-16 pb-24">
      {/* Background blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-200 rounded-full opacity-40 blur-3xl pointer-events-none" />
      <div className="absolute top-32 -left-24 w-80 h-80 bg-purple-200 rounded-full opacity-30 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white border border-violet-200 text-violet-700 text-sm font-semibold px-4 py-2 rounded-full shadow-sm">
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            Now in Beta — Free for early clinics!
          </div>
        </div>

        {/* Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-violet-900 leading-[1.1] tracking-tight mb-6">
            The smartest way to{" "}
            <span className="relative inline-block">
              <span className="text-violet-500">run</span>
            </span>{" "}
            your{" "}
            <span className="relative">
              <span className="bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">
                dental clinic.
              </span>
            </span>
          </h1>

          <p className="text-xl text-violet-700/80 max-w-2xl mx-auto leading-relaxed mb-10">
            Book appointments, manage patient records, bill seamlessly, and grow
            your practice — all in one platform built for Philippine dentists.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <a
              href="#get-started"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-violet-600 text-white font-bold text-lg px-8 py-4 rounded-full hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5"
            >
              Start for Free
              <ArrowRight size={20} />
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-violet-700 font-semibold text-lg px-8 py-4 rounded-full border border-violet-200 hover:border-violet-300 hover:bg-violet-50 transition-all"
            >
              See how it works
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-violet-600">
            <span className="font-medium text-violet-700">🇵🇭 Built for Philippine dentists</span>
            <span className="hidden sm:block text-violet-300">•</span>
            <span>No credit card required</span>
            <span className="hidden sm:block text-violet-300">•</span>
            <span>Setup in minutes</span>
          </div>
        </div>

        {/* Hero card/mockup */}
        <div className="mt-16 relative max-w-4xl mx-auto">
          <div className="bg-white rounded-4xl shadow-2xl shadow-violet-100 border border-violet-100 overflow-hidden">
            {/* Fake browser bar */}
            <div className="bg-violet-50 border-b border-violet-100 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-300" />
                <span className="w-3 h-3 rounded-full bg-yellow-300" />
                <span className="w-3 h-3 rounded-full bg-green-300" />
              </div>
              <div className="flex-1 mx-4 bg-white rounded-full px-3 py-1 text-xs text-violet-400 border border-violet-100">
                dentra.ph/clinic/sunshine-dental
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gradient-to-br from-violet-50/60 to-white">
              {/* Stat cards */}
              {[
                { label: "Today's Appointments", value: "12", color: "violet", sub: "3 upcoming" },
                { label: "Active Patients", value: "284", color: "purple", sub: "+6 this week" },
                { label: "Monthly Revenue", value: "₱48,200", color: "indigo", sub: "↑ 12% vs last mo." },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl p-4 border border-violet-100 shadow-sm"
                >
                  <p className="text-xs font-medium text-violet-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-violet-900">{s.value}</p>
                  <p className="text-xs text-violet-400 mt-1">{s.sub}</p>
                </div>
              ))}

              {/* Appointment list */}
              <div className="sm:col-span-2 bg-white rounded-2xl p-4 border border-violet-100 shadow-sm">
                <p className="text-xs font-semibold text-violet-600 mb-3 uppercase tracking-wide">
                  Upcoming Today
                </p>
                {[
                  { name: "Maria Santos", time: "9:00 AM", type: "Cleaning", status: "Confirmed" },
                  { name: "Juan dela Cruz", time: "10:30 AM", type: "Root Canal", status: "Check-in" },
                  { name: "Ana Reyes", time: "1:00 PM", type: "Braces Consult", status: "Pending" },
                ].map((a) => (
                  <div
                    key={a.name}
                    className="flex items-center justify-between py-2 border-b border-violet-50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs">
                        {a.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-violet-900">{a.name}</p>
                        <p className="text-xs text-violet-400">{a.time} · {a.type}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        a.status === "Confirmed"
                          ? "bg-violet-100 text-violet-700"
                          : a.status === "Check-in"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="bg-gradient-to-br from-violet-600 to-purple-500 rounded-2xl p-4 text-white">
                <p className="text-xs font-semibold opacity-80 mb-3 uppercase tracking-wide">
                  Quick Actions
                </p>
                {["New Patient", "Book Slot", "Record Payment", "Send Reminder"].map((a) => (
                  <button
                    key={a}
                    className="w-full text-left text-sm font-medium bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 mb-2 last:mb-0 transition-colors"
                  >
                    + {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
