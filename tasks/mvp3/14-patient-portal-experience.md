# Patient Portal Experience Completion

> **Status:** 🔲 Queued
> **Priority:** P1

## What & Why

Turn the `/portal` baseline into a complete patient-facing experience using the existing separate patient identity and consent boundaries.

## Done looks like

- Signup, sign-in, sign-out, session-expiry, and accessible recovery guidance.
- Explicit clinic-record linking and consent review UI with no automatic cross-clinic merge.
- Appointment history/detail, invoice/receipt detail, and treatment-plan summary pages.
- Reschedule/cancellation and contact-update request forms with status history.
- Profile/security area lists linked clinics and supports consent revocation safely.
- Mobile-first loading, empty, error, retry, and confirmation states.
- No clinical notes, odontogram, or prescription data is exposed without a separate approved policy.

## Dependencies

- Existing `mvp3/01-patient-portal.md` backend baseline.
