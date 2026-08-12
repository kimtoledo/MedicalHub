# Subscription Operations

> **Status:** ✅ Done — MVP 2 baseline

---

## What & Why

Clinics need the ability to view their subscription and request changes, and the platform needs to enforce usage limits (storage, SMS) tied to the active package. Payment automation remains manual until a billing provider is selected.

---

## Done looks like

- Clinic admin can view their current package, effective features, and subscription dates from within the PWA settings.
- Clinic admin can submit an upgrade/downgrade request — Super Admin approves and executes it.
- Add-on features can be activated with Super Admin approval.
- Usage counters (e.g. file storage used, SMS sent this month) are tracked and visible to the clinic admin.
- When a usage limit is reached, the relevant feature is blocked with a clear "upgrade required" message — not a silent failure.
- Entitlement effective dates are enforced: a package that expires reverts the clinic to its previous entitlement state.
- Payment automation for subscription changes remains manual in MVP 2 until a commercial provider is selected.

### Delivered

- Added clinic subscription overview and audited upgrade/downgrade/add-on request workflow with Super Admin review and package assignment on approval.
- Added period-scoped usage counters with explicit `USAGE_LIMIT_REACHED` responses instead of silent feature failures.
- Added responsive clinic subscription settings at `/app/settings/subscription`.

---

## Out of scope

- Automated billing and payment processing (MVP 3 — `tasks/mvp3/07-online-payments.md`).
- Self-service plan changes without Super Admin involvement (MVP 3 or later).
