# Integrations and Partner API

> **Status:** 🔵 Active — partner API baseline delivered

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
- Remaining: provider credential connectors, iCal/Google Calendar export, accounting formats, outbound delivery retries, and read-write partner resources.

---

## Out of scope

- A marketplace listing of integrations (can be added later).
- Direct EHR/EMR system integration (requires dedicated compliance and legal review).
