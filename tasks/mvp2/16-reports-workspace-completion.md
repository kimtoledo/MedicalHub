# Reports Workspace Completion

> **Status:** ✅ Done
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

## Delivered — August 13, 2026

- Manila-aware 7/30/90-day presets and custom date ranges persisted in the URL.
- Server-validated branch, dentist, appointment-status, service, and payment-method filters.
- Operational appointment detail, dentist/service workload, financial payment/procedure, and inventory stock tables with responsive empty states.
- Filter-preserving CSV exports with report-specific columns and filenames.
- Server-side `reports.basic` entitlement checks plus role-sensitive operational, financial, and inventory access.
- Loading, validation, error/retry states and route tests for filters, Manila bounds, role denial, CSV output, and reversed ranges.
