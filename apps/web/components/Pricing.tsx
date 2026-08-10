import { CheckCircle2, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "Perfect for solo dentists or small clinics just getting started.",
    features: [
      "1 branch",
      "Up to 3 staff accounts",
      "Online appointment booking",
      "Basic patient records",
      "Public clinic microsite",
    ],
    cta: "Get started free",
    highlight: false,
    badge: null,
  },
  {
    name: "Clinic",
    price: "₱1,499",
    period: "/ month",
    desc: "For growing clinics that need full practice management.",
    features: [
      "Up to 3 branches",
      "Unlimited staff accounts",
      "All Starter features",
      "Treatment plans & billing",
      "Odontogram & clinical notes",
      "Reminders & recall automation",
      "Reports & analytics",
    ],
    cta: "Start 30-day free trial",
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For multi-branch chains and dental group practices.",
    features: [
      "Unlimited branches",
      "Dedicated support",
      "Custom integrations",
      "SLA & uptime guarantee",
      "Audit & compliance reports",
    ],
    cta: "Contact us",
    highlight: false,
    badge: null,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
            Pricing
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-teal-900 leading-tight mb-4">
            Simple pricing.{" "}
            <span className="bg-gradient-to-r from-violet-500 to-teal-500 bg-clip-text text-transparent">
              No surprises.
            </span>
          </h2>
          <p className="text-lg text-teal-600 max-w-xl mx-auto">
            Start free. Upgrade when you need more. Cancel anytime — no lock-ins.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-3xl p-7 border relative ${
                p.highlight
                  ? "bg-teal-600 border-teal-500 text-white shadow-2xl shadow-teal-200 scale-[1.03]"
                  : "bg-white border-teal-100"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {p.badge}
                </span>
              )}

              <div className="mb-5">
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${p.highlight ? "text-teal-300" : "text-teal-500"}`}>
                  {p.name}
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl font-extrabold ${p.highlight ? "text-white" : "text-teal-900"}`}>
                    {p.price}
                  </span>
                  <span className={`text-sm font-medium ${p.highlight ? "text-teal-200" : "text-teal-400"}`}>
                    {p.period}
                  </span>
                </div>
                <p className={`text-sm ${p.highlight ? "text-teal-100" : "text-teal-500"}`}>
                  {p.desc}
                </p>
              </div>

              <ul className="space-y-2.5 mb-7">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2
                      size={16}
                      className={`mt-0.5 flex-shrink-0 ${p.highlight ? "text-teal-300" : "text-teal-500"}`}
                    />
                    <span className={p.highlight ? "text-teal-100" : "text-teal-700"}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="#get-started"
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-full font-bold text-sm transition-all ${
                  p.highlight
                    ? "bg-white text-teal-700 hover:bg-teal-50"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                }`}
              >
                {p.cta}
                <ArrowRight size={15} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
