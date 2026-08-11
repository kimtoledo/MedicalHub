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
