# Integrations and Partner API

> **Status:** 🔵 Active — partner API baseline and real webhook delivery delivered

---

## What & Why

Clinics and third-party developers need to connect Dentra.ph to external tools: accounting software, calendar apps, laboratory portals, and communication providers. A scoped API with webhook support unlocks this ecosystem.

---

## Done looks like

- Clinics can connect email and SMS provider accounts (e.g. SendGrid, Twilio) for use with the notifications system.
- Appointment data can be exported to Google Calendar or iCal format.
- Accounting export: invoice and payment data in a format compatible with common Philippine accounting tools.
- A public partner API is available with scoped API keys (read-only vs. read-write scopes per resource).
- Webhooks: clinics can subscribe to events (appointment created/updated, invoice paid) and receive verified payloads to their endpoint.
- API key management: create, revoke, and rotate keys from clinic settings.
- All API requests are rate-limited and logged.

### Delivered baseline

- Added hashed, one-time-visible clinic API keys with `appointments.read`, `invoices.read`, and `webhooks.manage` scopes plus revocation and last-use tracking.
- Added clinic-admin webhook subscription management with one-time-visible signing secrets and event-type declarations.
- Added rate-limited `GET /v1/partner/appointments` with tenant scope enforced by the API key and a bounded 31-day export window.
- Added audit events for API-key and webhook creation/revocation; raw secrets are never persisted or logged.
- **Real outbound webhook delivery (this update):** `appointment.created` (public booking), `appointment.updated` (clinic-staff status changes and kiosk self-check-in), `invoice.paid` (both manual clinic payment and online-payment webhook success), and `invoice.refunded` (manual clinic refund) now dispatch to every active, subscribed clinic webhook. Deliveries are HMAC-SHA256 signed (`x-dentra-webhook-signature`), sent with a 5s timeout, and retried with exponential backoff (capped at 60 min) for up to 5 attempts before being marked permanently failed.
- Fixed a signing-secret design gap discovered while building this: the webhook secret was only ever stored as a one-way hash (fine for verifying an inbound caller, useless for an outbound sender needing to *produce* a signature). Added an encrypted-at-rest `secretCiphertext` column (AES-256-GCM, server-held key) alongside the existing hash; webhooks created before this migration have no ciphertext and fail delivery with an explicit "recreate this webhook" reason rather than crashing or silently no-op'ing.
- Delivery history (event type, attempts, response status, last error) is queryable per webhook and surfaced in the settings UI; there is no cron/job-queue in this codebase, so retries are scheduled via in-process timers with a boot-time sweep (`processDueDeliveries`) to recover anything left queued across a process restart.
- **iCal/Google Calendar export (this update):** a clinic can generate a `calendar.feed`-scoped key that mints a subscribe URL (`.../calendar/appointments.ics?key=...`) any calendar app can poll — no session, no custom headers, matching how Google Calendar's "add by URL" actually works. The feed covers a rolling 7-days-back/60-days-ahead window and is rate-limited separately from the JSON partner endpoint (30/min). It reuses the existing API-key auth/scope machinery rather than a new credential type.
- **Accounting export (this update):** a clinic admin can download a software-agnostic CSV ledger (`GET .../integrations/accounting-export.csv?from&to`, session-authenticated, ≤366-day range) with one row per invoice-issued/payment-received/refund/adjustment event — deliberately not tied to a specific vendor (QuickBooks/Xero) since no such integration is configured; any PH bookkeeper can import a plain CSV.
- Remaining: provider credential connectors (email/SMS) and read-write partner resources.

---

## Out of scope

- A marketplace listing of integrations (can be added later).
- Direct EHR/EMR system integration (requires dedicated compliance and legal review).
