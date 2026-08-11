# Super Admin — Clinic Management

> **Status:** ✅ Done — all eight implementation steps are complete

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
- Routine clinic-operated invoice generation (delivered separately in MVP 1 Task 19).
- Self-service clinic sign-up (MVP 3 or separate onboarding flow).

---

## Steps

1. **Clinic list page** — ✅ `/dentra-admin/clinics` is wired to `GET /v1/admin/clinics` with search, status filter, pagination, package name, and branch count (#12).
2. **Create clinic form** — ✅ `/dentra-admin/clinics/new` validates and atomically creates the clinic, pending owner membership, initial package subscription, and audit events through `POST /v1/admin/clinics`.
3. **Clinic detail page** — ✅ `/dentra-admin/clinics/[id]` shows account info, owner, branches, subscription dates, active feature overrides, and effective feature-key entitlements.
4. **Status actions** — ✅ `/dentra-admin/clinics/[id]` supports confirmed activate, suspend, archive, and reactivate transitions through a protected API; every successful transition writes an immutable audit event.
5. **Branch management** — ✅ Super Admins can add clinic-scoped branches from the detail page through a reviewed confirmation flow; the first branch becomes main automatically, duplicate active main branches are rejected, and creation is audited.
6. **Package assignment** — ✅ Super Admins can assign an active package with a Manila effective date; subscription history is preserved, current entitlements respect effective periods, and duplicate future assignments are rejected.
7. **Feature overrides** — ✅ Super Admins can add or remove feature-key overrides with a required reason and optional expiry; previous overrides are expired for history and every change is audited.
8. **Microsite toggle** — ✅ Super Admins can publish or unpublish with confirmation; publishing requires an operational clinic and the effective `microsite.publish` entitlement, and updates `clinics.publication_status`.

---

## Project task refs

| Ref | Title |
|-----|-------|
| #12 | Let Super Admin see and search all clinics from one table |
