import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section id="get-started" className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 rounded-4xl px-8 py-16 text-center">
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
              Ready to modernize
              <br />
              your dental clinic?
            </h2>
            <p className="text-teal-100 text-lg max-w-xl mx-auto mb-10">
              Be among the first Philippine dental clinics on ToothHub — save time, grow your patient base, and deliver better care.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-teal-700 font-bold text-lg px-8 py-4 rounded-full hover:bg-teal-50 transition-all shadow-lg"
              >
                Start for free
                <ArrowRight size={20} />
              </a>
              <a
                href="#"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-full hover:bg-white/10 transition-all"
              >
                Book a demo
              </a>
            </div>

            <p className="text-teal-200 text-sm mt-6">
              No credit card required · Free forever for solo dentists
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
