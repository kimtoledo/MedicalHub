# Reports Workspace Completion

> **Status:** 🔲 Queued
> **Priority:** P1

## What & Why

Complete `/app/reports`, which currently requests a fixed 2020–2099 range and shows only three summary cards despite the richer report acceptance criteria.

## Done looks like

- Manila-aware presets and custom date range selection.
- Branch, dentist, status, service, and payment-method filters where applicable.
- Operational, financial, procedure/workload, and inventory detail tables with usable empty states.
- CSV download buttons preserve the selected filters and generate meaningful tabular exports.
- Role-sensitive financial visibility and `reports.basic` entitlement enforcement remain server-side.
- URL-backed filters, loading/error/retry states, responsive tables, and tests.

## Out of scope

- Advanced trend analytics, covered by `mvp3/18-advanced-analytics-ui.md`.
