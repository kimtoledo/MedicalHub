"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Features", href: "#features" },
  { label: "For Dentists", href: "#dentists" },
  { label: "Pricing", href: "#pricing" },
  { label: "Clinics", href: "#clinics" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#f0fdf9]/80 backdrop-blur-md border-b border-teal-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">TH</span>
          </div>
          <span className="font-bold text-teal-800 text-xl tracking-tight">
            ToothHub
            <span className="text-teal-500 text-sm font-semibold ml-1">PH</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-teal-700 hover:text-teal-500 font-medium text-sm transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/cl-login"
            className="text-teal-700 font-medium text-sm hover:text-teal-500 transition-colors"
          >
            Sign In
          </a>
          <a
            href="#get-started"
            className="bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-teal-700 transition-colors"
          >
            Get Started Free
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-teal-700"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden bg-white border-t border-teal-100 px-4 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-teal-700 font-medium"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#get-started"
            className="bg-teal-600 text-white font-semibold px-4 py-2 rounded-full text-center"
            onClick={() => setOpen(false)}
          >
            Get Started Free
          </a>
        </div>
      )}
    </header>
  );
}
