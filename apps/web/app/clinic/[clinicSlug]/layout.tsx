import type { CSSProperties, ReactNode } from 'react';

/** Clinic pages share attribution; page content supplies the clinic identity. */
export default function ClinicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f8f7ff]" style={{ '--booking-scroll-margin': '1.5rem' } as CSSProperties}>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-violet-100 bg-white px-4 py-6 text-center text-xs text-slate-500">
        Powered by{' '}
        <a href="https://dentra.ph" className="rounded font-semibold text-violet-600 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2">
          Dentra.ph
        </a>
      </footer>
    </div>
  );
}
