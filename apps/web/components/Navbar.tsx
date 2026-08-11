"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import DentraLogo from "@/components/brand/DentraLogo";

const links = [
  { label: "Features", href: "/#features" },
  { label: "Dentists", href: "/dentists" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Clinics", href: "/clinics" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#f5f3ff]/80 backdrop-blur-md border-b border-violet-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="/" aria-label="Dentra.ph home">
          <DentraLogo className="h-12 w-auto" />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-violet-700 hover:text-violet-500 font-medium text-sm transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/cl-login"
            className="text-violet-700 font-medium text-sm hover:text-violet-500 transition-colors"
          >
            Sign In
          </a>
          <a
            href="/#get-started"
            className="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-violet-700 transition-colors"
          >
            Get Started Free
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-violet-700"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div id="mobile-navigation" className="md:hidden bg-white border-t border-violet-100 px-4 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-violet-700 font-medium"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="/#get-started"
            className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-full text-center"
            onClick={() => setOpen(false)}
          >
            Get Started Free
          </a>
        </div>
      )}
    </header>
  );
}
