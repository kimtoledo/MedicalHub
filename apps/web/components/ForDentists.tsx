import { CheckCircle2, ArrowRight } from "lucide-react";

const perks = [
  "Your own public profile page on Dentra.ph",
  "Accept patient bookings online, anytime",
  "Manage your schedule across multiple clinics",
  "Showcase your specializations and credentials",
  "Get found by patients searching near them",
];

export default function ForDentists() {
  return (
    <section id="dentists" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-violet-900 to-violet-700 rounded-4xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left content */}
            <div className="p-10 lg:p-14 flex flex-col justify-center">
              <span className="inline-block bg-violet-500/20 text-violet-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-6">
                For Independent Dentists
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
                Your practice,{" "}
                <span className="text-violet-300">your brand.</span>
              </h2>
              <p className="text-violet-200 text-base leading-relaxed mb-8">
                Whether you run your own clinic or work across multiple branches, Dentra.ph gives you a professional online presence and the tools to manage your schedule effortlessly.
              </p>

              <ul className="space-y-3 mb-8">
                {perks.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-violet-400 mt-0.5 flex-shrink-0" />
                    <span className="text-violet-100 text-sm">{p}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#get-started"
                className="inline-flex items-center gap-2 bg-white text-violet-800 font-bold px-6 py-3 rounded-full w-fit hover:bg-violet-50 transition-colors"
              >
                Create your profile
                <ArrowRight size={18} />
              </a>
            </div>

            {/* Right — profile card mockup */}
            <div className="p-10 lg:p-14 flex items-center justify-center bg-violet-800/40">
              <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl">
                {/* Avatar */}
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 to-purple-400 flex items-center justify-center text-white text-3xl font-bold mb-3">
                    DR
                  </div>
                  <h3 className="font-bold text-violet-900 text-lg">Dr. Rica Mendoza</h3>
                  <p className="text-violet-500 text-sm">DDS · Orthodontics</p>
                  <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs font-semibold">
                    ★★★★★ <span className="text-violet-400 ml-1">(48 reviews)</span>
                  </div>
                </div>

                {/* Affiliations */}
                <div className="bg-violet-50 rounded-2xl p-3 mb-4">
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2">
                    Affiliated Clinics
                  </p>
                  {["Sunshine Dental Makati", "BrightSmile Ortigas"].map((c) => (
                    <div key={c} className="flex items-center gap-2 py-1">
                      <div className="w-2 h-2 rounded-full bg-violet-400" />
                      <span className="text-sm text-violet-700">{c}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button className="w-full bg-violet-600 text-white font-bold py-3 rounded-2xl text-sm hover:bg-violet-700 transition-colors">
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
