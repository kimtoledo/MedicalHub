# Super Admin — Package Management

> **Status:** 🔄 In progress — steps 1–3 of 4 complete

---

## What & Why

Super Admin defines what features each clinic can access through packages (plans) and feature entitlements. This is the entitlement engine that controls the entire platform. The current `/dentra-admin/packages` and `/dentra-admin/subscriptions` pages are stubs.

---

## Done looks like

- `/dentra-admin/packages` lists all packages with name, price display, feature count, and active clinic count.
- Super Admin can create, edit, and deactivate packages.
- Each package has a feature catalog mapping — Super Admin can toggle which `FeatureKey` values are included.
- `/dentra-admin/subscriptions` shows all clinic subscriptions with effective dates, package name, and status.
- Super Admin can reassign a clinic's subscription from this view (or from the clinic detail page).
- The entitlement check used by the API (`FeatureKey` from `packages/shared/src/enums.ts`) is consistent with what is stored in the DB.

---

## Out of scope

- Automated billing and payment collection (MVP 2 / MVP 3).
- Self-service plan upgrades by clinic admins (MVP 2).

---

## Steps

1. **Package list + create/edit** — ✅ `/dentra-admin/packages` lists price display, active clinic/feature counts, and supports audited create/edit/deactivate workflows with a canonical `FeatureKey` toggle matrix.
2. **Subscription list** — ✅ `/dentra-admin/subscriptions` is wired to protected `GET /v1/admin/subscriptions` with clinic/package search, status/package filters, pagination, and complete effective-date history.
3. **Subscription reassignment** — ✅ Current ledger rows expose the existing confirmed effective-date package-change workflow; historical rows remain read-only and active package options only are assignable.
4. **Feature catalog API** — ensure `GET /v1/entitlements/:clinicId` returns the resolved feature list so the PWA can gate features client-side.
