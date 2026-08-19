# Subscription Tier Capacity Limits (SOLO / CLINIC / BRANCHES)

> **Status:** ✅ Done — backend capacity/limit system implemented; Super Admin/clinic-facing UI is a separate follow-up task

---

## What & Why

The business is moving to a 3-tier subscription model, and today's package system (`11-subscription-operations.md`) only gates *features* — it has no concept of *headcount*. Nothing stops a clinic from adding unlimited branches, dentists, or staff regardless of what they're paying for.

- **SOLO** — 1 clinic, 1 dentist, 1 branch, no additional staff roles (the dentist is the sole user).
- **CLINIC** — 1 clinic, max 5 dentists, 1 branch, base includes exactly 1 user of each role: clinic admin, receptionist, dental assistant, cashier, inventory staff. Clinics can buy extra seats per role without upgrading to BRANCHES.
- **BRANCHES** — fully custom, configured per clinic by Super Admin: number of branches, dentists, users per role, feature add-ons, and negotiated price, all set per client contract. No fixed public catalog or automatic cap — Super Admin sets whatever the contract calls for. Branches share one clinic's patient/appointment data (this reuses the existing `branches` table — physical locations under a single clinic tenant. It is **not** related to `organizations`, which is a separate, unrelated feature for chains of independent clinic tenants).

This task adds the missing capacity/limit layer alongside the existing feature-entitlement layer, replaces the current placeholder packages (`starter`/`professional`/`enterprise` — demo seed data only, no live clinics affected) with SOLO/CLINIC/BRANCHES, and enforces limits at the points where dentists, branches, and staff get created.

---

## Scope

### Capacity model
- New `package_limits` table: per-package default caps for `dentists`, `branches`, and each of the 5 staff roles. Absent row = 0 (deny-by-default, mirrors how `package_features` already treats an absent feature key as unavailable). `limit = NULL` is an explicit "unlimited" sentinel, never implied by absence.
- New `clinic_limit_overrides` table (mirrors the existing `clinic_feature_overrides` pattern): per-clinic override of any metric's limit, with reason/grantedBy/expiresAt. This table is both the CLINIC-tier extra-seat mechanism *and* the entire BRANCHES-tier configuration mechanism — a BRANCHES clinic is a package with 0 baseline limits plus Super Admin writing one override row per metric. No BRANCHES-specific code path is needed anywhere.
- Enforcement is a live `COUNT`/`countDistinct` against the actual source tables (`dentist_branch_assignments`, `branches`, `clinic_memberships`) at check time — not a stored/incremented counter. The existing `clinic_usage_counters` table (period-scoped, built for resettable metrics like "SMS sent this month") is the wrong tool for standing headcount and is left untouched.

### Enforcement points
- Branch creation (`POST /v1/admin/clinics/:clinicId/branches`).
- Dentist affiliated to a clinic (`POST /v1/admin/dentists/:dentistId/affiliations`) — affiliating an already-counted dentist to a *second* branch of the same clinic must not double-count or get blocked.
- Staff invited to a clinic with a role (`POST /v1/clinic/:clinicId/staff/invitations`).
- Staff role change that increases a role's headcount (existing `update()` in staff service) — closes a side door around seat caps that the three primary sites alone wouldn't cover.

### CLINIC-tier add-on requests
- Reuse the existing `subscription_change_requests` (`type: 'addon'`) flow end to end. Add structured `requestedMetric`/`requestedLimit` (absolute target) columns so Super Admin approval can auto-apply the override, instead of hand-parsing free-text `reason` as today's `upgrade` requests already auto-apply on approval.

### BRANCHES pricing
- Add nullable `negotiatedPricePhp`/`billingNote` to `clinic_subscriptions` (new row per package assignment already gives free price history). `null` = use the package's standard `priceDisplay`.

### Downgrade / over-cap handling
- Changing a clinic to a lower limit never retroactively touches existing dentists/branches/staff. It only blocks the *next* net-new addition once usage is at or above the new limit. Admin UI surfaces a non-blocking warning when a change would leave the clinic over its new cap.

---

## Security and data invariants

- Filter every capacity check by `clinic_id`; never count across clinics.
- Deny-by-default: a package or metric with no explicit limit configured grants zero capacity, not unlimited.
- Capacity checks run inside the same transaction as the insert, behind a row lock on the clinic, so concurrent requests can't both slip past the same limit.
- Use canonical `CapacityMetric` values from `@dentra/shared` — never branch enforcement logic on package name/slug directly (same rule this codebase already applies to `FeatureKey`).
- Existing entities are never auto-deactivated or deleted as a side effect of a plan/limit change.

---

## Done looks like

1. Super Admin can configure per-package default limits and per-clinic overrides for dentists, branches, and each of the 5 staff roles.
2. A SOLO clinic cannot add a 2nd branch, a 2nd dentist, or any staff member — each attempt is rejected server-side with a clear limit-reached response, not a silent failure.
3. A CLINIC-tier clinic can have up to 5 dentists and 1 of each staff role by default, and can request/receive additional seats per role without changing tiers.
4. A BRANCHES clinic's caps and price are fully driven by Super Admin-configured overrides, with no separate code path from CLINIC's add-on mechanism.
5. A dentist already affiliated with one branch of a clinic can be affiliated with a second branch of the *same* clinic without being blocked or double-counted, regardless of remaining dentist headroom.
6. Downgrading a clinic below its current usage never removes or disables existing dentists/branches/staff; it only blocks further growth until usage drops, with a warning shown to Super Admin.
7. Approving an add-on request immediately raises the clinic's effective limit for that metric.
8. Schema migration, API tests (including the new limit-denied paths), and typechecks pass.
9. `LOGS.md` and this task's status are updated.

---

## Delivery sequence

1. Schema (`package_limits`, `clinic_limit_overrides`, `clinic_subscriptions` pricing columns, `subscription_change_requests` structured addon columns) and generated migration.
2. `CapacityMetric` shared enum + role→metric mapping in `@dentra/shared`.
3. `assertClinicCapacity()` / `getClinicCapacitySummary()` helper.
4. Wire the 3 enforcement call sites + the staff role-change gap.
5. Super Admin package-limits management + per-clinic override management (API).
6. Add-on request structured fields + auto-apply on approval.
7. Replace demo seed packages (`starter`/`professional`/`enterprise` → `solo`/`clinic`/`branches`) with limits, and reassign demo clinic staff data to a tier it doesn't violate.
8. Tests (new capacity-denied cases, updated DB-mock call sequences), `LOGS.md`, task status.
9. Follow-up (separate task): Super Admin and clinic-facing UI to surface usage/limits and the add-on request form.

---

## Delivered

- Migration `0050_overconfident_umar.sql` adds `package_limits`, `clinic_limit_overrides`, `clinic_subscriptions.negotiated_price_php`/`billing_note`, and `subscription_change_requests.requested_metric`/`requested_limit`.
- `CapacityMetric` and `CLINIC_ROLE_CAPACITY_METRIC` added to `@dentra/shared`; absent `package_limits`/`clinic_limit_overrides` rows deny by default, `limit: null` is the explicit unlimited sentinel.
- `apps/api/src/entitlements/capacity.ts`: `assertClinicCapacity`/`getClinicCapacitySummary` resolve override → package base → 0, and count live usage against `dentist_branch_assignments`/`branches`/`clinic_memberships` directly rather than a stored counter.
- Wired into branch creation, dentist-clinic affiliation (skipping the check when the dentist is already counted elsewhere in the same clinic), staff invite, and staff role changes — each behind a row lock on the clinic to avoid races, each returning a `*_LIMIT_REACHED` 409.
- Super Admin can manage per-package default limits (`admin/packages-service.ts`) and per-clinic overrides (`admin/clinic-settings-service.ts` `setLimitOverride`/`removeLimitOverride`, routes at `/v1/admin/clinics/:clinicId/limit-overrides`); both this and package assignment return non-blocking `warnings` when a change leaves current usage above the new limit — downgrades never retroactively touch existing dentists/branches/staff, they only block further growth.
- CLINIC-tier add-on requests (`subscription_change_requests` type `addon`) now carry a structured absolute `requestedMetric`/`requestedLimit` and auto-apply as a `clinicLimitOverrides` row on Super Admin approval, the same way package upgrade requests already auto-apply.
- Replaced the placeholder `starter`/`professional`/`enterprise` demo packages with `solo`/`clinic`/`branches` in `scripts/seed-demo.ts`, including their limits. The two demo clinics were reassigned by their actual seeded shape rather than force-fit: Smile Bright Dental (2 branches, 2 dentists) → Branches tier with explicit overrides; BrightSmile (1 branch) → Clinic tier, fitting entirely within its default limits with no overrides needed.
- Verified against the real local dev database: capacity summaries correctly resolve overrides vs. package defaults, and `assertClinicCapacity` correctly blocks metrics that are already at or over their resolved limit while allowing metrics under cap.
- Verified with 537 passing API tests (10 new, covering the capacity helper directly and the denied-request path at each of the three enforcement sites) and a clean repository-wide TypeScript check across `apps/api` and `apps/web`.

---

## Explicit non-goals

- Automated payment/billing processing for the negotiated BRANCHES price (still manual, per `11-subscription-operations.md`'s existing out-of-scope note).
- Any change to the `organizations` (multi-clinic chain) feature — confirmed unrelated to this tier model.
- Self-service (non-Super-Admin-reviewed) plan upgrades/downgrades.
- Super Admin and clinic-facing UI screens (tracked as a follow-up task once this backend layer lands).
