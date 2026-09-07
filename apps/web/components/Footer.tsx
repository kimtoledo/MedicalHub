"use client";

import { useEffect, useState } from "react";
import { Facebook, Instagram, Linkedin, Twitter, Youtube, ArrowUp } from "lucide-react";

const cols = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Clinic Directory", href: "/clinics" },
      { label: "Dentist Directory", href: "/dentists" },
      { label: "Clinic App", href: "/cl-login" },
    ],
  },
  {
    heading: "For Clinics",
    links: [
      { label: "Getting Started", href: "/#get-started" },
      { label: "Appointment Booking", href: "/clinics" },
      { label: "Patient Records", href: "/#features" },
      { label: "Staff Management", href: "/#features" },
      { label: "Sign In", href: "/cl-login" },
    ],
  },
  {
    heading: "For Dentists",
    links: [
      { label: "Dentist Directory", href: "/dentists" },
      { label: "Manage Schedule", href: "/cl-login" },
      { label: "Clinic Affiliations", href: "/#dentists" },
      { label: "Online Visibility", href: "/#dentists" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Dentra.ph", href: "/" },
      { label: "Book a Demo", href: "mailto:hello@dentra.ph?subject=Book%20a%20Dentra.ph%20demo" },
      { label: "Contact Us", href: "mailto:hello@dentra.ph" },
    ],
  },
];

const socials = [
  { label: "Twitter", href: "https://twitter.com/dentraph", Icon: Twitter },
  { label: "Facebook", href: "https://facebook.com/dentraph", Icon: Facebook },
  { label: "Instagram", href: "https://instagram.com/dentraph", Icon: Instagram },
  { label: "LinkedIn", href: "https://linkedin.com/company/dentraph", Icon: Linkedin },
  { label: "YouTube", href: "https://youtube.com/@dentraph", Icon: Youtube },
];

function FloatingBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 400);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed right-4 z-50 flex items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-950/20 transition-all duration-300 hover:bg-violet-700 active:scale-95 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      } bottom-[calc(1rem+env(safe-area-inset-bottom))] h-12 w-12 sm:right-6 sm:h-11 sm:w-11`}
    >
      <ArrowUp className="h-5 w-5 sm:h-4 sm:w-4" />
    </button>
  );
}

export default function Footer() {
  return (
    <footer className="bg-gray-50 text-gray-500 py-16 px-4 sm:px-6">
      <FloatingBackToTop />
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Link columns */}
          {cols.map((col) => (
            <div key={col.heading}>
              <p className="text-gray-900 font-semibold text-sm mb-4">{col.heading}</p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-gray-500 hover:text-gray-900 text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Social column */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-gray-900 font-semibold text-sm mb-4">Social Media</p>
            <div className="flex flex-wrap gap-3">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-white hover:bg-violet-600 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 text-center sm:text-left text-sm text-gray-500">
          <p>© {new Date().getFullYear()} by Dentra.ph All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
