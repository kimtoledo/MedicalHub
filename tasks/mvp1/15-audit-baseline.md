# Audit Baseline

> **Status:** ✅ Done

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

1. ✅ **Audit service** — added the shared transaction-aware `writeAudit` helper in `packages/db` and routed all API audit writes through it.
2. ✅ **Instrument sensitive routes** — clinic lifecycle/settings, dentist state/affiliation, packages/entitlements, booking/appointment status, patients, encounters, treatments, odontogram, invoice/payment, prescription, and clinical-file mutations append scoped audit events atomically; signed file access is audited per request.
3. ✅ **Admin audit page** — wired `/dentra-admin/audit` to the Super Admin-only `GET /v1/admin/audit` with actor, action, Manila date-range, and pagination filters.
4. ✅ **Audit integrity** — migration `0007_audit_immutability.sql` adds a PostgreSQL trigger that rejects every update or delete against `audit_events`.
