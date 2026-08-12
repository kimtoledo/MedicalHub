# Platform Operations Console

> **Status:** 🔲 Queued
> **Priority:** P2

## What & Why

Provide Super Admin pages for support-access and tenant export/offboarding workflows without granting routine clinical access.

## Done looks like

- Queues for support-access requests and tenant export/offboarding requests.
- Written justification, approval/denial, expiry, processing state, and audit history are visible.
- No support button silently opens clinical records; scoped support sessions require separate backend enforcement.
- Platform inventory/health summaries clearly distinguish live signals from unavailable integrations.
- Retention/deletion actions remain disabled until workers and policy controls are complete.
- Responsive, role-protected, audited, and tested.

## Dependencies

- Remaining worker/session/retention work in `mvp3/11-platform-operations.md`.
