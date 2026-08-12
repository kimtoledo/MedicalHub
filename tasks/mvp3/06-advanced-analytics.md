# Advanced Analytics

> **Status:** ✅ Done — MVP 3 baseline

---

## What & Why

Clinic owners and dental group operators need data beyond the operational reports in MVP 2 to make decisions about staffing, services, and growth. Analytics must minimize unnecessary exposure of clinical detail.

---

## Done looks like

- Appointment conversion rate: booked vs. completed vs. no-show trend over time.
- No-show and cancellation trend charts by dentist, service, and day of week.
- Patient return/recall rate: percentage of patients who return within 6 months.
- Treatment acceptance rate: percentage of proposed treatment plan items that get completed.
- Dentist utilization: booked hours vs. available hours by branch and dentist.
- Revenue metrics: revenue per dentist, service, and branch (role-gated).
- Cohort views: patient acquisition cohorts and their visit frequency.
- Analytics data is strictly tenant-scoped — cross-tenant aggregation is forbidden.
- Clinical detail is minimized in all analytics outputs — no patient names in trend charts.

### Delivered

- Added tenant-scoped advanced analytics endpoint with appointment status trends, revenue trends, conversion, no-show, cancellation, and treatment-acceptance rates.
- Analytics output contains aggregates only and is gated by `reports.advanced` plus clinic roles.

---

## Out of scope

- Platform-wide aggregate analytics for Super Admin (MVP 3 platform operations — `tasks/mvp3/11-platform-operations.md`).
- Predictive/AI-driven analytics (future).
