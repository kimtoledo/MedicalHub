import { Search, Stethoscope, Building2, Home } from "lucide-react";
import DentraLogo from "@/components/brand/DentraLogo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Page Not Found",
};

const shortcuts = [
  {
    label: "Find a dentist",
    description: "Browse verified dental professionals near you",
    href: "/dentists",
    Icon: Stethoscope,
  },
  {
    label: "Find a clinic",
    description: "Explore clinics using Dentra.ph",
    href: "/clinics",
    Icon: Building2,
  },
  {
    label: "Go home",
    description: "Back to the Dentra.ph homepage",
    href: "/",
    Icon: Home,
  },
];

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="bg-[#f5f3ff] px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <DentraLogo variant="icon" className="h-14 w-14 mx-auto mb-8 opacity-80" />

          <p className="text-8xl sm:text-9xl font-bold tracking-tight bg-gradient-to-br from-violet-600 to-violet-400 bg-clip-text text-transparent">
            404
          </p>

          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900">
            This page took a sick day.
          </h1>
          <p className="mt-3 text-gray-500 max-w-md mx-auto">
            We couldn&apos;t find the page you&apos;re looking for. It may have moved, or the
            link might be broken.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/"
              className="w-full sm:w-auto bg-violet-600 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-violet-700 transition-colors"
            >
              Back to Home
            </a>
            <a
              href="/dentists"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-violet-200 bg-white text-violet-700 text-sm font-semibold px-6 py-3 rounded-full hover:bg-violet-50 transition-colors"
            >
              <Search className="h-4 w-4" />
              Find a Dentist
            </a>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {shortcuts.map(({ label, description, href, Icon }) => (
              <a
                key={label}
                href={href}
                className="group rounded-2xl border border-violet-100 bg-white p-5 hover:border-violet-300 hover:shadow-md transition-all"
              >
                <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 font-semibold text-gray-900 text-sm">{label}</p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{description}</p>
              </a>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
