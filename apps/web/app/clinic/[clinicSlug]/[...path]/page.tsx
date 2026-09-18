import { notFound } from 'next/navigation';

// Keep unknown clinic URLs inside the clinic layout and its local 404 screen.
// Explicit subpages (such as /appointment) take precedence over this fallback.
export default function UnknownClinicPage() {
  notFound();
}
