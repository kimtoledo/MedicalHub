# Reports

> **Status:** 🔜 Future — MVP 2

---

## What & Why

Clinic admins and dentists need data to run their practice effectively. Reports must be scoped strictly to the requesting clinic — cross-tenant aggregation is forbidden by the platform's security model.

---

## Done looks like

**Operational reports:**
- Appointment counts by status, date range, dentist, and branch.
- No-show rate and cancellation rate.
- Patient registration count by period.
- Procedure counts by type and dentist.
- Dentist workload summary.

**Financial reports** (requires billing task `03`):
- Collections by period, payment method, dentist, and service.
- Outstanding invoice balances.
- Invoice and payment summary.
- Revenue by service, dentist, and branch (gated by role).

**Inventory reports** (requires inventory task `06`):
- Current stock levels.
- Usage by item and period.
- Low-stock and expiring-item lists.

**Export:**
- All reports can be exported as CSV.
- Reports cannot aggregate or reference data from another clinic.

---

## Out of scope

- Advanced analytics with trend visualization (MVP 3 — `tasks/mvp3/06-advanced-analytics.md`).
- Platform-wide aggregate reporting for Super Admin (MVP 3 platform operations).
