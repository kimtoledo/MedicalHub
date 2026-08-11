# Super Admin — Clinic Management

> **Status:** 🔵 Active — clinic list, onboarding, and detail are ✅ Done; remaining management steps are queued

---

## What & Why

Super Admin needs to create and manage clinics end-to-end: from onboarding a new clinic, assigning it a package, to suspending or archiving it. The current `/dentra-admin/clinics` page is a stub. This task turns it into a fully functional management surface backed by the real API.

---

## Done looks like

- `/dentra-admin/clinics` shows a live, searchable, paginated table of all clinics with columns for name, slug, status, package, and branch count (#12).
- Super Admin can create a new clinic (name, slug, owner email, package assignment) via a slide-over form or dedicated page.
- Clinic detail page shows: account info, branches list, assigned package, effective entitlements, feature overrides, and subscription dates.
- Super Admin can activate, suspend, archive, and reactivate a clinic from the detail page.
- Super Admin can add branches to a clinic.
- Super Admin can assign or change a clinic's package with an effective start date.
- Super Admin can add/remove feature overrides with a required reason field.
- Super Admin can toggle the clinic's public microsite (publish/unpublish).
- All state-change actions (suspend, activate, archive) create an audit entry.

---

## Out of scope

- Patient or clinical record access from the admin panel.
- Billing/invoice generation (MVP 2).
- Self-service clinic sign-up (MVP 3 or separate onboarding flow).

---

## Steps

1. **Clinic list page** — ✅ `/dentra-admin/clinics` is wired to `GET /v1/admin/clinics` with search, status filter, pagination, package name, and branch count (#12).
2. **Create clinic form** — ✅ `/dentra-admin/clinics/new` validates and atomically creates the clinic, pending owner membership, initial package subscription, and audit events through `POST /v1/admin/clinics`.
3. **Clinic detail page** — ✅ `/dentra-admin/clinics/[id]` shows account info, owner, branches, subscription dates, active feature overrides, and effective feature-key entitlements.
4. **Status actions** — implement activate/suspend/archive/reactivate buttons that call the appropriate API endpoints and require confirmation.
5. **Branch management** — allow adding branches to a clinic from the detail page.
6. **Package assignment** — allow changing a clinic's package from the detail page with an effective-date input.
7. **Feature overrides** — allow adding/removing feature overrides with a reason field; show current effective entitlements.
8. **Microsite toggle** — publish/unpublish button that updates `clinics.is_public`.

---

## Project task refs

| Ref | Title |
|-----|-------|
| #12 | Let Super Admin see and search all clinics from one table |
