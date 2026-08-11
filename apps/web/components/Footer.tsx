import DentraLogo from "@/components/brand/DentraLogo";

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

export default function Footer() {
  return (
    <footer className="bg-violet-950 text-violet-300 py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <DentraLogo variant="white" className="h-12 w-auto mb-4" />
            <p className="text-sm text-violet-400 leading-relaxed">
              The all-in-one dental practice management platform for the Philippines.
            </p>
          </div>

          {/* Link columns */}
          {cols.map((col) => (
            <div key={col.heading}>
              <p className="text-white font-semibold text-sm mb-4">{col.heading}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-violet-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-violet-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-violet-500">
          <p>© {new Date().getFullYear()} Dentra.ph. All rights reserved.</p>
          <p>Built with ❤️ for Philippine dental professionals.</p>
        </div>
      </div>
    </footer>
  );
}
