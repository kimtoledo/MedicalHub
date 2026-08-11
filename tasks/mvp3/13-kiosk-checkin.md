# Kiosk Self Check-In

> **Status:** 🔜 Future — MVP 3
> **Proposal alignment:** Executive Summary §5 — Phase 3 (Kiosk check-in for bigger clinics)

---

## What & Why

Larger multi-dentist clinics with high patient volumes need a self-service check-in experience to reduce front-desk load. The executive summary lists kiosk check-in as a Phase 3 feature. A kiosk is a locked-down browser session on a clinic-owned tablet or display that allows patients to announce their arrival without staff intervention.

---

## Done looks like

- A kiosk URL (`/kiosk/{branchId}`) is accessible from a clinic-owned tablet locked to that URL in guided-access / kiosk browser mode.
- Patient enters their name or patient number on the kiosk screen to look up their appointment for today.
- On match, they confirm their arrival; the appointment status transitions to `checked_in`.
- Clinic staff see the check-in on the appointment calendar/list in real-time (or near-real-time polling).
- Kiosk session is **unauthenticated** — no patient account required; it only looks up appointments by patient number or name + date of birth within the branch's today schedule.
- No clinical data (medical history, treatment records, chart) is ever displayed on the kiosk.
- Kiosk auto-resets to the home screen after 60 seconds of inactivity.
- Kiosk is feature-gated (`FeatureKey.KIOSK_CHECKIN`).

---

## Out of scope

- Patient login or account creation from the kiosk.
- Payment collection from the kiosk (future).
- Queue display board (separate future task).
- Integration with physical kiosk hardware (QR scanners, printers).

---

## Steps

1. **FeatureKey** — Add `KIOSK_CHECKIN` to shared enums and appropriate package mappings.
2. **Kiosk route** — `/kiosk/[branchId]` Next.js route with a full-screen, touch-optimized layout.
3. **Appointment lookup** — Public API endpoint that accepts patient number or (last name + date of birth) and returns today's matching appointment(s) for the given branch — no clinical data in the response.
4. **Check-in action** — API endpoint (rate-limited, no auth) to transition appointment status to `checked_in` and write an audit entry.
5. **Auto-reset** — Inactivity timer that returns the kiosk to the home screen after 60 seconds.
6. **Staff notification** — Appointment list in the clinic app updates on check-in (polling or SSE).

## Relevant files

- `packages/db/src/schema/appointments.ts`
- `packages/shared/src/enums.ts`
- `tasks/mvp1/08-appointment-booking-public.md`
