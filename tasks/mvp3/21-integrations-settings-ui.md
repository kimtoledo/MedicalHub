# Integrations and API Settings UI

> **Status:** 🔲 Queued
> **Priority:** P2

## What & Why

Expose scoped API keys, webhook subscriptions, and exports through clinic settings without weakening one-time secret handling.

## Done looks like

- Create/revoke scoped API keys with one-time secret display and explicit confirmation.
- Create/manage webhook endpoints, event types, signing-secret handoff, and delivery status.
- iCal/appointment and accounting export controls when the corresponding backend formats are complete.
- Last-use/delivery metadata, retry guidance, rate-limit documentation, and audit links.
- Tenant, role, and scope enforcement plus responsive/error/test coverage.

## Dependencies

- Remaining backend/export/delivery work in `mvp3/09-integrations-api.md`.
