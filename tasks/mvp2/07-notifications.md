# Notifications

> **Status:** 🔵 Active — reminder scheduling and cancellation event wiring delivered; production provider credentials remain

---

## What & Why

Patients need automated reminders for upcoming appointments, and confirmation when they book or cancel. Sensitive clinical details must never appear in notification text.

---

## Done looks like

**Email notifications (via a transactional email provider):**
- ✅ Booking confirmation is queued to the patient email on appointment creation.
- ✅ Appointment reminder sent 24 hours before the appointment.
- 🔶 Cancellation/reschedule notification when an appointment status changes — cancellation is wired; reschedule is not (see note below — this codebase has no actual "move this appointment" action to hook yet).
- Recall reminder when a patient is due for a follow-up (see task `08-recall-followup.md`).

**SMS (adapter-ready, provider deferred):**
- An email/SMS provider adapter interface is defined but not wired to a live provider in MVP 2.
- SMS usage metering and opt-out/consent policy must be designed before any live SMS send.

**Safety rules:**
- Notification text contains no sensitive clinical information (no diagnosis, procedure details, or medication names).
- All notifications are opt-in or use consent-implied booking.
- Retry logic handles transient provider failures without sending duplicate messages.

### Delivered foundation

- Added a tenant-aware notification outbox with channel/type/status, dedupe keys, retry metadata, and provider-safe delivery transitions.
- Added non-sensitive booking-confirmation templating and wired public booking creation to enqueue the message when an email is provided.
- **Reminder scheduling (this update):** `enqueue()` now accepts an optional `nextAttemptAt`, reusing the outbox's existing `nextAttemptAt <= now()` filter (`processDue()`) rather than adding a new scheduling column. `appointmentReminderNotification()` sets it to `startsAt - 24h`; public booking creation enqueues one alongside the existing booking-confirmation whenever the appointment is more than 24h out. Since this codebase has no cron/scheduler (confirmed: the only recurring-work pattern anywhere is a boot-time sweep), a reminder scheduled 24h ahead also gets an in-process `setTimeout` at booking time for the common case of a long-lived server process — `processDue()`'s boot sweep is the fallback if the process restarts before the timer fires, exactly mirroring how failed-delivery retries already behave in this same service.
- **Cancellation event wiring (this update):** `updateStatus()` in `clinic/dashboard-service.ts` now enqueues an `appointmentCancelledNotification` whenever a status transition lands on `cancelled` and the appointment has a patient email — reusing the same enqueue-then-`attemptDelivery` pattern already used for booking confirmations. **Reschedule is not wired**, and deliberately so: this codebase currently has no code path that actually moves an appointment's `startsAt`/`endsAt` — a patient can only submit an `appointment_reschedule` *request* (`patientPortalRequests`) that nothing yet reviews or actions. `appointmentRescheduledNotification()` is built and exported, ready for whichever future feature actually executes a reschedule — inventing that execution flow now would be building a different, larger feature (reviewing/actioning patient portal requests) that wasn't asked for here.
- Caught a real correctness detail while wiring reminders: `attemptDelivery()` doesn't check `nextAttemptAt` itself — it delivers unconditionally once a row is `queued`. This is fine for the `setTimeout`-based path (the delay itself provides the correct timing) but means `attemptDelivery` must never be called immediately after enqueuing a future-dated notification.
- Verified both flows end-to-end against the real dev database: a reminder's `nextAttemptAt` computes correctly, is correctly excluded by `processDue()` while not yet due, and a cancellation correctly enqueues the right notification with the right dedupe key.
- Verified 428 passing API tests, repository-wide TypeScript checks, and production web/API builds.
- Remaining: production provider credentials (SendGrid/Twilio API keys) — an external setup step for the user, not a code task; recall event wiring is tracked separately in `08-recall-followup.md`.

---

## Out of scope

- In-app push notifications (MVP 3).
- WhatsApp / Viber integration (MVP 3).

### Appointment receipt extension — 2026-09-18

- Expand the existing booking receipt with the booking reference, selected service, assigned dentist, Philippine time range, and pending clinic confirmation status (requested by the user). Keep reason for visit and clinical notes out of email.
- Implementation and verification tracked with `../mvp1/08-appointment-booking-public.md`.
- Completed: receipt template expanded and verified; existing transactional enqueue and post-commit delivery retained. Local SMTP settings are present; live inbox delivery was not tested.

### Personalized booking receipt — 2026-09-18

- User-requested copy refinement: greet the patient by their submitted name, thank them for choosing the clinic, and explain the next steps warmly while preserving booking details and pending confirmation wording.
- Tracked under this existing task using the small-change exception; Replit task panel is unavailable locally.
- Completed: receipt uses the submitted full patient name, a thank-you opening, helpful next steps, and a clinic-team sign-off. All 15 focused tests, API typecheck, and API build pass.
