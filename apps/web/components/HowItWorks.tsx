const steps = [
  {
    step: "01",
    title: "Create your clinic account",
    desc: "Sign up in minutes. Add your clinic details, branches, and staff. No technical knowledge needed.",
    color: "bg-violet-100 text-violet-700",
  },
  {
    step: "02",
    title: "Set up your public profile",
    desc: "Publish your clinic microsite on ToothHub so patients can discover you, read reviews, and book online.",
    color: "bg-purple-100 text-purple-700",
  },
  {
    step: "03",
    title: "Manage everything in one place",
    desc: "From your phone or desktop — view your calendar, handle patient records, and track payments daily.",
    color: "bg-indigo-100 text-indigo-700",
  },
];

export default function HowItWorks() {
  return (
    <section id="clinics" className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
            How it works
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-violet-900 leading-tight mb-4">
            Up and running{" "}
            <span className="bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-text text-transparent">
              in three steps.
            </span>
          </h2>
          <p className="text-lg text-violet-600 max-w-xl mx-auto">
            Getting your dental clinic onto ToothHub takes less time than a cleaning appointment.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector lines */}
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-violet-200 to-purple-200" />

          {steps.map((s, i) => (
            <div key={s.step} className="flex flex-col items-center text-center relative">
              <div
                className={`w-24 h-24 rounded-3xl ${s.color} flex flex-col items-center justify-center mb-6 font-extrabold text-2xl shadow-sm`}
              >
                {s.step}
              </div>
              <h3 className="font-bold text-violet-900 text-xl mb-3">{s.title}</h3>
              <p className="text-violet-600 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
