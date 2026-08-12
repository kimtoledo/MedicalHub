# Service Catalog and Pricing

> **Status:** ✅ Done — tenant-scoped service catalog and effective pricing shipped

---

## What & Why

Each clinic needs its own list of services with prices. Branches can optionally override the clinic-level price. When a price changes, existing invoices must not be retroactively updated — historical pricing must be preserved.

---

## Done looks like

- Clinic admin can manage a service catalog from `/app/settings/services`.
- Each service: name, category, description, base price, duration (minutes), bookable flag, active/inactive status.
- A branch can set a branch-specific price that overrides the clinic-level price for that location.
- Price changes are stored with effective dates; historical invoices retain the price that was current at time of billing.
- Bookable services appear in the public booking wizard; non-bookable services are for internal clinical use only.

---

## Out of scope

- Platform-level service catalog or price mandates from Super Admin.
- Insurance/HMO fee schedules.
