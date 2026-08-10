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
    links: ["About ToothHub", "Blog", "Careers", "Contact Us", "Privacy Policy"],
  },
];

export default function Footer() {
  return (
    <footer className="bg-teal-950 text-teal-300 py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-teal-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">TH</span>
              </div>
              <span className="font-bold text-white text-lg tracking-tight">
                ToothHub <span className="text-teal-400 text-sm">PH</span>
              </span>
            </div>
            <p className="text-sm text-teal-400 leading-relaxed">
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
                      className="text-teal-400 hover:text-white text-sm transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-teal-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-teal-500">
          <p>© {new Date().getFullYear()} ToothHub PH. All rights reserved.</p>
          <p>Built with ❤️ for Philippine dental professionals.</p>
        </div>
      </div>
    </footer>
  );
}
