# Advanced Analytics UI

> **Status:** ✅ Done
> **Priority:** P2

## What & Why

Expose the existing advanced analytics aggregates through a decision-useful, tenant-scoped clinic interface.

## Done looks like

- Date range and branch filters for appointment/revenue trends.
- Conversion, no-show, cancellation, and treatment acceptance metrics with definitions.
- Accessible charts using Dentra colors plus tabular alternatives.
- Role and `reports.advanced` entitlement enforcement at API and UI boundaries.
- No patient names or clinical notes in aggregate payloads.
- Loading, empty, error, export, responsive, and test coverage.

## Delivered

- Added a responsive `/app/analytics` workspace with Manila-time presets, custom date bounds, and assigned-branch filters.
- Added appointment and invoiced-revenue trend charts with accessible tabular alternatives plus clearly defined conversion, no-show, cancellation, and treatment-acceptance metrics.
- Added aggregate-only CSV export and a 366-day server-side query limit.
- Enforced `reports.advanced`, clinic role, tenant, and branch scope at the API and UI boundaries; dentists do not receive revenue trends.
- Treatment acceptance is explicitly unavailable for branch-only scopes because treatment plans are currently clinic-owned, avoiding cross-branch inference or misleading filtering.
- Verified 290 API tests, 5 web tests, repository-wide typechecks, production web/API builds, and clean diff validation.

## Dependencies

- `mvp3/06-advanced-analytics.md` API baseline.
