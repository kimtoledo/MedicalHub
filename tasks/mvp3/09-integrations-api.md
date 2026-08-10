# Integrations and Partner API

> **Status:** 🔜 Future — MVP 3

---

## What & Why

Clinics and third-party developers need to connect ToothHub to external tools: accounting software, calendar apps, laboratory portals, and communication providers. A scoped API with webhook support unlocks this ecosystem.

---

## Done looks like

- Clinics can connect email and SMS provider accounts (e.g. SendGrid, Twilio) for use with the notifications system.
- Appointment data can be exported to Google Calendar or iCal format.
- Accounting export: invoice and payment data in a format compatible with common Philippine accounting tools.
- A public partner API is available with scoped API keys (read-only vs. read-write scopes per resource).
- Webhooks: clinics can subscribe to events (appointment created/updated, invoice paid) and receive verified payloads to their endpoint.
- API key management: create, revoke, and rotate keys from clinic settings.
- All API requests are rate-limited and logged.

---

## Out of scope

- A marketplace listing of integrations (can be added later).
- Direct EHR/EMR system integration (requires dedicated compliance and legal review).
