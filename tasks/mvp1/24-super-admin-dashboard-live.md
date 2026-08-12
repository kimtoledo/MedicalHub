# Live Super Admin Dashboard

> **Status:** ✅ Done
> **Priority:** P1

## What & Why

Replace the hard-coded `/dentra-admin` KPIs, clinic status counts, and recent activity with protected platform aggregates and audit data.

## Done looks like

- Live clinic counts by status, current subscription counts, dentist count, and appointment aggregate.
- Recent activity is sourced from immutable audit events with safe labels and timestamps.
- Quick actions link directly to the correct create/manage screens.
- Loading, empty, error, and retry states are responsive and accessible.
- Only Super Admin can access platform aggregates; no clinical payloads are returned.
- Endpoint and page tests cover authorization and aggregate accuracy.

## Out of scope

- Patient-level or clinical-record drill-down.
- Full platform observability, which belongs to MVP 3 platform operations.

## Delivered — August 13, 2026

- Protected live platform aggregates for clinic status, current subscription status, dentist profiles, and all-time/30-day appointments.
- Recent activity sourced from immutable audit events without returning metadata, IP addresses, user agents, patient data, or clinical payloads.
- Correct create/manage/audit quick-action destinations, accessible loading/empty/error/retry states, and responsive layouts.
- Tests cover aggregate normalization and Super Admin-only authorization.
