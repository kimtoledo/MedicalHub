# Public Appointment Booking

> **Status:** ✅ Done

---

## What & Why

Patients can book appointments directly from the public clinic microsite or dentist profile — no account required. Booking creates a pending appointment in the database and notifies the clinic. The system must prevent double-booking.

---

## Done looks like

**Clinic route** (`/clinic/[clinicSlug]/appointment`):
1. Choose branch.
2. Choose service.
3. Choose dentist (or "any available").
4. Choose date from a live availability calendar.
5. Choose an available time slot.
6. Enter patient name, contact number, and reason for visit.
7. Server validates and creates the appointment; returns a confirmation number.
8. Patient sees a confirmation screen with appointment details.

**Dentist route** (`/dentists/[dentistSlug]/appointment`):
- Same flow starting from clinic/branch affiliation selection.

**Conflict prevention:**
- Overlapping bookings for the same dentist/slot are rejected at the API level, not just in the UI.
- Inactive clinic, inactive dentist, or inactive service cannot be booked.
- Slot availability respects operating hours from clinic settings.

---

## Out of scope

- Patient account creation or login (MVP 3 patient portal).
- Online payment at time of booking (MVP 3).
- SMS/email confirmation (MVP 2 notifications).
- Patient-initiated reschedule/cancel (MVP 3 patient portal).

---

## Steps

1. **Availability API** — ✅ `GET /v1/public/clinics/[slug]/availability` resolves operating hours, service duration, active dentist assignments, and conflicts across all clinic affiliations.
2. **Booking API** — ✅ `POST /v1/public/appointments` validates the public booking boundary and serializes the final overlap check in a transaction before writing the appointment, initial status history, and audit event.
3. **Booking wizard UI** — ✅ The clinic route provides a responsive three-step flow for visit selection, live time slots, and patient contact/reason details.
4. **Dentist booking page** — ✅ The dentist route reuses the wizard with the dentist fixed and active clinic/branch affiliations selectable or prefilled from the profile CTA.
5. **Confirmation page** — ✅ Successful submission displays the pending status, reference number, clinic, branch, dentist, service, and schedule.

## Validation bug fix — 2026-09-18

- Scope: allow the wizard’s empty reCAPTCHA token when verification is unconfigured, while requiring verification whenever the server secret is configured.
- Add route regressions for unconfigured, missing, rejected, and accepted tokens. Existing task bug-fix exception applies; the Replit task panel is not available in this local session.
- Completed: 13 booking tests pass, including seven new configuration/verification regressions; repository typechecks and production builds pass.

## Submission experience and receipt email — 2026-09-18

- User-requested extension: animated submission screen, duplicate-submit guard, recoverable errors, and a clear pending-request summary.
- Expand the existing transactional receipt email with booking reference, clinic/branch, selected service, assigned dentist, and Philippine schedule. Exclude the reason for visit and clinical notes.
- Reuse the notification outbox and configured provider delivery; verify receipt content and UI submission behavior. Replit task panel unavailable locally; this work is authorized by the user's request and tracked here before implementation.
- Completed: animated loader with reduced-motion support, synchronous duplicate-submit guard, form preservation on error, accessible focus/scroll handling, and detailed pending confirmation screen. Receipt email uses the same reference and assigned dentist as the response.
- Verified: 36 focused API tests, repository typechecks/builds, and mocked desktop/mobile browser flows including retries and Book again. Full suite: 571 passing, one existing integration test fails because the test process does not load `DATABASE_URL` from `.env`. No live booking or email was created during browser verification.

## Confirmation follow-up — 2026-09-18

- User-requested small UI follow-up: add a Book again action and receipt-email notice to the shared confirmation screen.
- Reset the wizard to visit selection, clearing prior availability, consent, errors, and CAPTCHA state before another submission. Keep the current clinic/visit selections for convenience.
- Replit task panel is unavailable locally; tracked under this existing booking task using the small-fix exception.

## Contact-details dentist summary — 2026-09-18

- Small UI follow-up requested by the user: show the selected dentist in the contact-details visit summary on both public booking routes; show “Any available dentist” when no dentist was selected.
- Tracked under the existing booking task using the small-fix exception; Replit task panel unavailable locally.

## Clinic booking layout — 2026-09-18

- Clinic booking inherits the shared `/clinic/[clinicSlug]/layout.tsx`: no Dentra marketing header/footer, one layout-owned Powered by Dentra.ph attribution. Page content shows the clinic identity and Back to clinic link.
- Applies to all future clinic subpages; documented in `docs/BRANDING.md` and agent instructions. Dentist-route booking retains its existing shell. Implementation tracked under task 06.

## Booking visual refinement — 2026-09-18

- User-requested design enhancement: refine clinic identity/header, numbered booking progress, field/CTA styling, and responsive spacing. Add a live visit summary to clinic booking with selected branch, service, dentist, date/time, and duration.
- Preserve the shared clinic shell and Powered by Dentra.ph attribution, real availability, submission loader, retry behavior, confirmation, and email delivery. No invented prices or booking guarantees.
- Track before implementation under this existing task; Replit task panel is unavailable locally and the user has authorized the enhancement.
- Completed: clinic identity/header refinement, numbered progress with accessible current/completed states, consistent fields and CTAs, refreshed schedule/contact steps, responsive live summary, and next-step guidance. Summary is opt-in for clinic booking; shared controls also benefit dentist booking.
- Added step-heading focus/scroll for mobile and keyboard navigation, contact autocomplete, pressed-state semantics for slots, and clearing stale times when visit selections change.
- Verified all 20 web tests, web typecheck, production build, and mocked browser checks for full booking flow, dynamic summary, empty date, stale time reset, focus, reduced motion, and widths 320/390/768/1024/1280. No live appointments or emails created. Existing lint CLI limitation remains.

## Minimum submission loading duration — 2026-09-18

- User-requested small UI change: keep the submission loader visible for at least five seconds on success or failure. Start the request immediately; longer requests keep the loader until completion without adding another five seconds. Keep repeat submissions blocked during the entire wait.
- Tracked under this existing task using the small-change exception; Replit task panel unavailable locally.
- Completed: a five-second timer runs alongside submission; both success and error rendering await it. Browser timing checks pass for fast success/failure (at least five seconds), slow success (no added five-second delay), and repeat-submit blocking. All 20 web tests, web typecheck, and production build pass.
