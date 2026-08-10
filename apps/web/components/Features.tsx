import {
  CalendarDays,
  ClipboardList,
  Users,
  CreditCard,
  Building2,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    color: "bg-teal-100 text-teal-600",
    title: "Smart Appointment Booking",
    desc: "Let patients book online 24/7 — no phone tag, no double bookings. Your calendar, always in sync.",
  },
  {
    icon: ClipboardList,
    color: "bg-cyan-100 text-cyan-700",
    title: "Digital Patient Records",
    desc: "Complete dental charts, encounter notes, odontograms, and treatment history — all in one secure place.",
  },
  {
    icon: Users,
    color: "bg-emerald-100 text-emerald-700",
    title: "Full Staff Management",
    desc: "Role-based access for owners, dentists, receptionists, and assistants — everyone sees only what they need.",
  },
  {
    icon: CreditCard,
    color: "bg-violet-100 text-violet-600",
    title: "Billing & Invoices",
    desc: "Generate invoices, track payments, and manage balances. Know exactly where your clinic finances stand.",
  },
  {
    icon: Building2,
    color: "bg-pink-100 text-pink-600",
    title: "Public Clinic Microsite",
    desc: "Your own branded page on ToothHub — searchable by patients, bookable online, no web dev needed.",
  },
  {
    icon: ShieldCheck,
    color: "bg-amber-100 text-amber-600",
    title: "Secure & Compliant",
    desc: "Patient data is encrypted and access-controlled. Built with Philippine privacy requirements in mind.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-teal-100 text-teal-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
            Everything you need
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-teal-900 leading-tight mb-4">
            One platform.{" "}
            <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
              All your clinic needs.
            </span>
          </h2>
          <p className="text-lg text-teal-600 max-w-xl mx-auto">
            From the front desk to the dental chair — ToothHub keeps everything connected so you can focus on your patients.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white rounded-3xl p-6 border border-teal-100 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-50 transition-all group"
              >
                <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center mb-4`}>
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-teal-900 text-lg mb-2">{f.title}</h3>
                <p className="text-teal-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
