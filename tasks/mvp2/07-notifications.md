# Notifications

> **Status:** 🔜 Future — MVP 2

---

## What & Why

Patients need automated reminders for upcoming appointments, and confirmation when they book or cancel. Sensitive clinical details must never appear in notification text.

---

## Done looks like

**Email notifications (via a transactional email provider):**
- Booking confirmation sent to the patient email on appointment creation.
- Appointment reminder sent 24 hours before the appointment.
- Cancellation/reschedule notification when an appointment status changes.
- Recall reminder when a patient is due for a follow-up (see task `08-recall-followup.md`).

**SMS (adapter-ready, provider deferred):**
- An SMS provider adapter interface is defined but not wired to a live provider in MVP 2.
- SMS usage metering and opt-out/consent policy must be designed before any live SMS send.

**Safety rules:**
- Notification text contains no sensitive clinical information (no diagnosis, procedure details, or medication names).
- All notifications are opt-in or use consent-implied booking.
- Retry logic handles transient provider failures without sending duplicate messages.

---

## Out of scope

- In-app push notifications (MVP 3).
- WhatsApp / Viber integration (MVP 3).
