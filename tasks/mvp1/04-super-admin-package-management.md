# Super Admin — Package Management

> **Status:** 🔲 Queued — no project task yet

---

## What & Why

Super Admin defines what features each clinic can access through packages (plans) and feature entitlements. This is the entitlement engine that controls the entire platform. The current `/th-admin/packages` and `/th-admin/subscriptions` pages are stubs.

---

## Done looks like

- `/th-admin/packages` lists all packages with name, price display, feature count, and active clinic count.
- Super Admin can create, edit, and deactivate packages.
- Each package has a feature catalog mapping — Super Admin can toggle which `FeatureKey` values are included.
- `/th-admin/subscriptions` shows all clinic subscriptions with effective dates, package name, and status.
- Super Admin can reassign a clinic's subscription from this view (or from the clinic detail page).
- The entitlement check used by the API (`FeatureKey` from `packages/shared/src/enums.ts`) is consistent with what is stored in the DB.

---

## Out of scope

- Automated billing and payment collection (MVP 2 / MVP 3).
- Self-service plan upgrades by clinic admins (MVP 2).

---

## Steps

1. **Package list + create/edit** — wire `/th-admin/packages` to the API; build create/edit form with feature-toggle matrix.
2. **Subscription list** — wire `/th-admin/subscriptions` to `GET /v1/admin/subscriptions` with filtering.
3. **Subscription reassignment** — allow changing a clinic's package from the subscriptions view.
4. **Feature catalog API** — ensure `GET /v1/entitlements/:clinicId` returns the resolved feature list so the PWA can gate features client-side.
