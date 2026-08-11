import DentraLogo from "@/components/brand/DentraLogo";

const cols = [
  {
    heading: "Product",
    links: ["Features", "Pricing", "Clinic Directory", "Dentist Directory", "PWA"],
  },
  {
    heading: "For Clinics",
    links: ["Getting Started", "Appointment Booking", "Patient Records", "Staff Management", "Billing"],
  },
  {
    heading: "For Dentists",
    links: ["Create Profile", "Manage Schedule", "Clinic Affiliations", "Online Visibility"],
  },
  {
    heading: "Company",
    links: ["About Dentra.ph", "Blog", "Careers", "Contact Us", "Privacy Policy"],
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
                  <li key={link}>
                    <a
                      href="#"
                      className="text-violet-400 hover:text-white text-sm transition-colors"
                    >
                      {link}
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
