# Integrations and API Settings UI

> **Status:** ✅ Done
> **Priority:** P2

## What & Why

Expose scoped API keys, webhook subscriptions, and exports through clinic settings without weakening one-time secret handling.

## Done looks like

- Create/revoke scoped API keys with one-time secret display and explicit confirmation.
- Create/manage webhook endpoints, event types, signing-secret handoff, and delivery status.
- iCal/appointment and accounting export controls when the corresponding backend formats are complete.
- Last-use/delivery metadata, retry guidance, rate-limit documentation, and audit links.
- Tenant, role, and scope enforcement plus responsive/error/test coverage.

## Delivered

- Added `/app/settings/integrations`: create scoped API keys (`appointments.read`, `invoices.read`, `webhooks.manage`) with a one-time secret reveal, list keys with prefix/scopes/last-used time, and revoke active keys.
- Added webhook subscription management (name, endpoint URL, event types) with a one-time signing-secret reveal, delivery/failure metadata display, and a new disable action.
- Added `POST /v1/clinic/:clinicId/integrations/webhooks/:webhookId/disable` (mirrors the existing key-revoke guard: only an active webhook can be disabled, conditional update, audited) since the schema already had an unused `disabled` status and the task calls for webhooks to be "managed," not just created.
- iCal/Google Calendar export and accounting export are shown as explicit "coming soon" cards rather than non-functional controls, since neither backend format exists yet per `mvp3/09-integrations-api.md`.
- Documented the partner API base path, auth header, and rate/date-range limits directly on the settings page.
- Clinic-owner/admin role scoping and per-clinic tenant isolation were already enforced server-side (no entitlement gate exists yet, matching the rest of the integrations baseline); added 9 new API tests covering key/webhook create/list/revoke/disable authorization and partner-API auth/scope/success paths.
- Verified 315 passing API tests (9 new), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation.

## Dependencies

- Remaining backend/export/delivery work in `mvp3/09-integrations-api.md` (iCal/calendar export, accounting export formats, webhook delivery/retry worker — the UI surfaces these as "coming soon" rather than blocking on them).
