# Public Appointment Booking

> **Status:** 🔲 Queued — no project task yet

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

1. **Availability API** — `GET /v1/public/clinics/[slug]/availability` returning available slots for a dentist/date/service.
2. **Booking API** — `POST /v1/public/appointments` with server-side conflict check inside a transaction.
3. **Booking wizard UI** — multi-step form at `apps/web/app/clinic/[clinicSlug]/appointment/page.tsx`.
4. **Dentist booking page** — `apps/web/app/dentists/[dentistSlug]/appointment/page.tsx` reusing the same wizard with pre-filled dentist context.
5. **Confirmation page** — display appointment reference number and summary.
