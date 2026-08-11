# Audit Baseline

> **Status:** 🔲 Queued — no project task yet

---

## What & Why

Every sensitive action on the platform must leave an immutable audit trail. The `audit_logs` table already exists in the schema. This task ensures audit entries are actually written for all defined sensitive actions across both the Super Admin and Clinic surfaces.

---

## Done looks like

The following events generate an audit entry (actor, action, target entity, timestamp, before/after state where applicable):

- Clinic created / suspended / reactivated / archived.
- Clinic role / membership changed.
- Plan / entitlement changed (package assignment, feature override add/remove).
- Appointment status changed (confirmed, checked-in, completed, cancelled, no-show).
- Encounter created / updated / finalized.
- Treatment record created.
- Odontogram event added / corrected.

The Super Admin audit log page (`/dentra-admin/audit`) shows a paginated, filterable list of all platform-level events with actor, action, and timestamp.

---

## Out of scope

- Patient-facing audit history view (MVP 3).
- Automated alerting on anomalous events (MVP 3 platform operations — `tasks/mvp3/11-platform-operations.md`).

---

## Steps

1. **Audit service** — create a shared `writeAudit(actor, action, entityType, entityId, meta)` helper in `packages/db` used by all API routes.
2. **Instrument sensitive routes** — add `writeAudit` calls to every route listed in the "Done looks like" section above.
3. **Admin audit page** — wire `/dentra-admin/audit` to `GET /v1/admin/audit` with date range, action type, and actor filters.
4. **Audit integrity** — ensure audit rows can never be updated or deleted; enforce this with a DB constraint or RLS policy.
